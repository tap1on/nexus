import { db } from "./db";
import {
  computeMetrics,
  emptyTotals,
  MetricRow,
  RawTotals,
} from "./metrics";

export type GroupBy = "buyer" | "account" | "campaign" | "adset" | "ad" | "date";

export type StatsQuery = {
  from: string;
  to: string;
  groupBy: GroupBy;
  /** restrict to these adAccount ids (buyer scope / admin filter); null = all */
  accountIds: string[] | null;
  /** drill-down filters (Meta campaign / adset ids) */
  campaignId?: string;
  adsetId?: string;
};

export type StatsResult = {
  rows: MetricRow[];
  totals: MetricRow;
  /** EF revenue in range whose sub4 (ad id) doesn't match any known Meta ad */
  unmatchedRevenue: number;
  unmatchedConversions: number;
  /** daily matched series for the trend chart */
  daily: Array<{ date: string; spend: number; revenue: number; profit: number }>;
};

type AdContext = {
  accountId: string;
  metaAccountId: string;
  accountName: string;
  ownerId: string | null;
  ownerName: string;
  campaignId: string;
  campaignName: string;
  adsetId: string;
  adsetName: string;
  adId: string;
  adName: string;
};

/**
 * Map every ad we've EVER seen on Meta to its context, using the most recent
 * names. Built from all MetaStat rows (not range-limited) because an Everflow
 * conversion can land days after the ad last spent.
 */
async function buildAdContextMap(
  accountIds: string[] | null
): Promise<Map<string, AdContext>> {
  const ads = await db.metaStat.findMany({
    where: accountIds ? { adAccountId: { in: accountIds } } : undefined,
    orderBy: { date: "desc" },
    distinct: ["adId"],
    select: {
      adId: true,
      adName: true,
      adsetId: true,
      adsetName: true,
      campaignId: true,
      campaignName: true,
      adAccountId: true,
      adAccount: {
        select: {
          name: true,
          metaAccountId: true,
          ownerId: true,
          owner: { select: { name: true } },
        },
      },
    },
  });
  const map = new Map<string, AdContext>();
  for (const a of ads) {
    map.set(a.adId, {
      accountId: a.adAccountId,
      metaAccountId: a.adAccount.metaAccountId,
      accountName: a.adAccount.name,
      ownerId: a.adAccount.ownerId,
      ownerName: a.adAccount.owner?.name ?? "Unassigned",
      campaignId: a.campaignId,
      campaignName: a.campaignName,
      adsetId: a.adsetId,
      adsetName: a.adsetName,
      adId: a.adId,
      adName: a.adName,
    });
  }
  return map;
}

function groupKeyOf(ctx: AdContext, date: string, groupBy: GroupBy): [string, string, string?] {
  switch (groupBy) {
    case "buyer":
      return [ctx.ownerId ?? "unassigned", ctx.ownerName];
    case "account":
      return [ctx.accountId, ctx.accountName];
    case "campaign":
      return [ctx.campaignId, ctx.campaignName, ctx.accountName];
    case "adset":
      return [ctx.adsetId, ctx.adsetName, ctx.campaignName];
    case "ad":
      return [ctx.adId, ctx.adName, `${ctx.campaignName} › ${ctx.adsetName}`];
    case "date":
      return [date, date];
  }
}

export async function queryStats(q: StatsQuery): Promise<StatsResult> {
  const where = {
    date: { gte: q.from, lte: q.to },
    ...(q.accountIds ? { adAccountId: { in: q.accountIds } } : {}),
    ...(q.campaignId ? { campaignId: q.campaignId } : {}),
    ...(q.adsetId ? { adsetId: q.adsetId } : {}),
  };
  // Any narrowing means "unmatched" can't be judged from this query alone.
  const scoped = Boolean(q.accountIds || q.campaignId || q.adsetId);
  const inDrill = (ctx: AdContext) =>
    (!q.campaignId || ctx.campaignId === q.campaignId) &&
    (!q.adsetId || ctx.adsetId === q.adsetId);

  const [metaRows, adMap] = await Promise.all([
    db.metaStat.findMany({
      where,
      select: {
        date: true,
        adId: true,
        spend: true,
        impressions: true,
        clicks: true,
      },
    }),
    buildAdContextMap(q.accountIds),
  ]);

  const efRows = await db.everflowStat.findMany({
    where: { date: { gte: q.from, lte: q.to } },
    select: {
      date: true,
      adId: true,
      clicks: true,
      conversions: true,
      revenue: true,
    },
  });

  // Offers with a Step 1 / Step 2 event mapping, keyed instanceId:offerId.
  const mappedOffers = await db.offer.findMany({
    where: {
      networkOfferId: { not: null },
      OR: [{ step1Event: { not: "" } }, { step2Event: { not: "" } }],
    },
    select: { instanceId: true, networkOfferId: true, step1Event: true, step2Event: true },
  });
  const stepMap = new Map(
    mappedOffers.map((o) => [
      `${o.instanceId}:${o.networkOfferId}`,
      { step1: o.step1Event, step2: o.step2Event },
    ])
  );
  const eventRows = stepMap.size
    ? await db.everflowEventStat.findMany({
        where: { date: { gte: q.from, lte: q.to } },
        select: { date: true, instanceId: true, offerId: true, adId: true, event: true, count: true },
      })
    : [];

  const groups = new Map<
    string,
    { label: string; sublabel?: string; ids?: MetricRow["ids"]; t: RawTotals }
  >();
  const HIERARCHY: GroupBy[] = ["account", "campaign", "adset", "ad"];
  const totals = emptyTotals();
  const daily = new Map<
    string,
    { spend: number; revenue: number }
  >();
  const day = (d: string) => {
    let e = daily.get(d);
    if (!e) {
      e = { spend: 0, revenue: 0 };
      daily.set(d, e);
    }
    return e;
  };
  const group = (ctx: AdContext, date: string) => {
    const [key, label, sublabel] = groupKeyOf(ctx, date, q.groupBy);
    let g = groups.get(key);
    if (!g) {
      g = {
        label,
        sublabel,
        ids: HIERARCHY.includes(q.groupBy)
          ? { accountId: ctx.accountId, campaignId: ctx.campaignId, adsetId: ctx.adsetId }
          : undefined,
        t: emptyTotals(),
      };
      groups.set(key, g);
    }
    return g;
  };

  // Spend side
  for (const r of metaRows) {
    const ctx = adMap.get(r.adId);
    if (!ctx) continue; // shouldn't happen: map built from same table
    const g = group(ctx, r.date);
    g.t.spend += r.spend;
    g.t.impressions += r.impressions;
    g.t.metaClicks += r.clicks;
    totals.spend += r.spend;
    totals.impressions += r.impressions;
    totals.metaClicks += r.clicks;
    day(r.date).spend += r.spend;
  }

  // Revenue side — matched strictly on sub4 = ad id
  let unmatchedRevenue = 0;
  let unmatchedConversions = 0;
  for (const r of efRows) {
    const ctx = r.adId ? adMap.get(r.adId) : undefined;
    if (!ctx) {
      // Either truly broken subids, or an ad belonging to accounts outside
      // the caller's scope. Only count it as unmatched for unscoped queries.
      if (!scoped) {
        unmatchedRevenue += r.revenue;
        unmatchedConversions += r.conversions;
      }
      continue;
    }
    if (!inDrill(ctx)) continue; // known ad, but outside the campaign/adset drill
    const g = group(ctx, r.date);
    g.t.efClicks += r.clicks;
    g.t.conversions += r.conversions;
    g.t.revenue += r.revenue;
    totals.efClicks += r.clicks;
    totals.conversions += r.conversions;
    totals.revenue += r.revenue;
    day(r.date).revenue += r.revenue;
  }

  // Step events — only for offers whose events are mapped, joined like revenue
  for (const r of eventRows) {
    const steps = stepMap.get(`${r.instanceId}:${r.offerId}`);
    if (!steps) continue;
    const ctx = r.adId ? adMap.get(r.adId) : undefined;
    if (!ctx || !inDrill(ctx)) continue;
    const g = group(ctx, r.date);
    if (r.event === steps.step1) {
      g.t.step1 += r.count;
      totals.step1 += r.count;
    }
    if (r.event === steps.step2) {
      g.t.step2 += r.count;
      totals.step2 += r.count;
    }
  }

  const rows = [...groups.entries()]
    .map(([key, g]) => computeMetrics(key, g.label, g.t, g.sublabel, g.ids))
    .sort((a, b) =>
      q.groupBy === "date" ? a.key.localeCompare(b.key) : b.spend - a.spend
    );

  const dailySeries = [...daily.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      spend: v.spend,
      revenue: v.revenue,
      profit: v.revenue - v.spend,
    }));

  return {
    rows,
    totals: computeMetrics("__totals__", "Total", totals),
    unmatchedRevenue,
    unmatchedConversions,
    daily: dailySeries,
  };
}

/**
 * Meta hierarchy lookups for the drill-down UI (dropdown options and
 * breadcrumb names). Names come from the most recent MetaStat row, so a
 * renamed campaign shows its current name. Not range-limited: a campaign
 * that stopped spending should still be navigable.
 */
export async function listCampaigns(accountIds: string[]) {
  const rows = await db.metaStat.findMany({
    where: { adAccountId: { in: accountIds } },
    orderBy: { date: "desc" },
    distinct: ["campaignId"],
    select: { campaignId: true, campaignName: true, adAccountId: true },
  });
  return rows
    .map((r) => ({ id: r.campaignId, name: r.campaignName, accountId: r.adAccountId }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listAdsets(accountIds: string[], campaignId: string) {
  const rows = await db.metaStat.findMany({
    where: { adAccountId: { in: accountIds }, campaignId },
    orderBy: { date: "desc" },
    distinct: ["adsetId"],
    select: { adsetId: true, adsetName: true },
  });
  return rows
    .map((r) => ({ id: r.adsetId, name: r.adsetName }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Resolve a campaign or adset id to its parent ids and current name, within scope. */
export async function lookupNode(
  accountIds: string[],
  where: { campaignId: string } | { adsetId: string }
) {
  return db.metaStat.findFirst({
    where: { adAccountId: { in: accountIds }, ...where },
    orderBy: { date: "desc" },
    select: {
      adAccountId: true,
      campaignId: true,
      campaignName: true,
      adsetId: true,
      adsetName: true,
    },
  });
}

/** Rows for the Unmatched Revenue page: EF stats whose ad id is unknown. */
export async function queryUnmatched(from: string, to: string) {
  const [efRows, knownAds, instances, accounts] = await Promise.all([
    db.everflowStat.findMany({
      where: { date: { gte: from, lte: to } },
      orderBy: [{ date: "desc" }, { revenue: "desc" }],
    }),
    db.metaStat.findMany({ distinct: ["adId"], select: { adId: true } }),
    db.everflowInstance.findMany({ select: { id: true, name: true } }),
    db.adAccount.findMany({ select: { metaAccountId: true, name: true } }),
  ]);
  const known = new Set(knownAds.map((a) => a.adId));
  const instName = new Map(instances.map((i) => [i.id, i.name]));
  // source_id carries the meta ad account id — fallback attribution when the
  // sub macros are broken but the link's source_id survived.
  const accName = new Map(accounts.map((a) => [a.metaAccountId, a.name]));
  return efRows
    .filter((r) => !r.adId || !known.has(r.adId))
    .map((r) => ({
      date: r.date,
      instance: instName.get(r.instanceId) ?? r.instanceId,
      sub1: r.campaignId,
      sub3: r.adsetId,
      sub4: r.adId,
      sourceAccount: r.sourceId ? (accName.get(r.sourceId) ?? r.sourceId) : "",
      offer: r.offerName || r.offerId,
      clicks: r.clicks,
      conversions: r.conversions,
      revenue: r.revenue,
    }));
}
