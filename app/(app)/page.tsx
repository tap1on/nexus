import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  queryStats,
  listCampaigns,
  listAdsets,
  lookupNode,
  GroupBy,
} from "@/lib/stats";
import { todayBerlin, shiftDate } from "@/lib/dates";
import { FilterBar } from "@/components/FilterBar";
import { KpiTiles } from "@/components/KpiTiles";
import { TrendChart } from "@/components/TrendChart";
import { StatsTable } from "@/components/StatsTable";
import { fmtMoney } from "@/lib/format";

const GROUPS: GroupBy[] = ["buyer", "account", "campaign", "adset", "ad", "date"];

type NavParams = {
  group: string;
  buyer: string;
  account: string;
  campaign: string;
  adset: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Pages render in parallel with the layout, so the layout's redirect does
  // not save us from a null session here.
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const today = todayBerlin();
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : shiftDate(today, -6);
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : today;

  // Scope: buyers see only their accounts; admins can narrow to one buyer.
  // Retired accounts stay in the list because their history stays in reports.
  const buyerFilter = sp.buyer && user.role === "ADMIN" ? sp.buyer : undefined;
  const scopedAccounts = await db.adAccount.findMany({
    where:
      user.role === "BUYER"
        ? { ownerId: user.id }
        : buyerFilter
          ? { ownerId: buyerFilter }
          : {},
    select: { id: true, name: true, status: true },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  const scopeIds = scopedAccounts.map((a) => a.id);

  // Drill path: account › campaign › adset. Every level is validated against
  // the caller's scope so nobody reaches foreign data by editing the URL, and
  // a deeper id fills in its parents so the breadcrumb is always complete.
  let account = sp.account && scopeIds.includes(sp.account) ? sp.account : "";
  let campaign = sp.campaign ?? "";
  let adset = sp.adset ?? "";
  let campaignName = "";
  let adsetName = "";
  const drillScope = account ? [account] : scopeIds;
  if (adset) {
    const n = drillScope.length ? await lookupNode(drillScope, { adsetId: adset }) : null;
    if (!n) adset = "";
    else {
      adsetName = n.adsetName;
      campaign = n.campaignId;
      campaignName = n.campaignName;
      account = n.adAccountId;
    }
  }
  if (campaign && !campaignName) {
    const n = drillScope.length ? await lookupNode(drillScope, { campaignId: campaign }) : null;
    if (!n) campaign = "";
    else {
      campaignName = n.campaignName;
      account = n.adAccountId;
    }
  }
  const accountName = scopedAccounts.find((a) => a.id === account)?.name ?? "";

  // Default grouping follows the drill level, like Ads Manager tabs.
  const defaultGroup: GroupBy = adset ? "ad" : campaign ? "adset" : account ? "campaign" : "account";
  const groupBy: GroupBy = GROUPS.includes(sp.group as GroupBy)
    ? (sp.group as GroupBy)
    : defaultGroup;

  let accountIds: string[] | null = null;
  if (account) accountIds = [account];
  else if (user.role === "BUYER" || buyerFilter) accountIds = scopeIds;

  const [stats, buyers, campaigns, adsets] = await Promise.all([
    queryStats({
      from,
      to,
      groupBy,
      accountIds,
      campaignId: campaign || undefined,
      adsetId: adset || undefined,
    }),
    user.role === "ADMIN"
      ? db.user.findMany({
          where: { active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    account ? listCampaigns([account]) : Promise.resolve([]),
    campaign ? listAdsets(drillScope, campaign) : Promise.resolve([]),
  ]);

  // URL builder: keeps the date range and overrides only what's passed.
  const href = (p: Partial<NavParams>) => {
    const v: NavParams = {
      group: groupBy,
      buyer: buyerFilter ?? "",
      account,
      campaign,
      adset,
      ...p,
    };
    const qs = new URLSearchParams({ from, to });
    for (const k of ["group", "buyer", "account", "campaign", "adset"] as const) {
      if (v[k]) qs.set(k, v[k]);
    }
    return `/?${qs.toString()}`;
  };

  // Clicking a row drills one level down.
  const rows = stats.rows.map((r) => {
    if (groupBy === "account") {
      return { ...r, href: href({ account: r.key, campaign: "", adset: "", group: "campaign" }) };
    }
    if (groupBy === "campaign" && r.ids) {
      return {
        ...r,
        href: href({ account: r.ids.accountId, campaign: r.key, adset: "", group: "adset" }),
      };
    }
    if (groupBy === "adset" && r.ids) {
      return {
        ...r,
        href: href({
          account: r.ids.accountId,
          campaign: r.ids.campaignId,
          adset: r.key,
          group: "ad",
        }),
      };
    }
    return r;
  });

  const crumbs: Array<{ label: string; href: string }> = [
    { label: "All ad accounts", href: href({ account: "", campaign: "", adset: "", group: "account" }) },
  ];
  if (account) crumbs.push({ label: accountName, href: href({ campaign: "", adset: "", group: "campaign" }) });
  if (campaign) crumbs.push({ label: campaignName, href: href({ adset: "", group: "adset" }) });
  if (adset) crumbs.push({ label: adsetName, href: href({ group: "ad" }) });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl text-ink">Dashboard</h2>
          <p className="text-ink-3 text-sm">
            {from} → {to} · Berlin time · revenue by conversion date
          </p>
        </div>
      </div>

      <FilterBar
        from={from}
        to={to}
        groupBy={groupBy}
        buyers={buyers}
        buyer={user.role === "ADMIN" ? buyerFilter ?? "" : undefined}
        accounts={scopedAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          retired: a.status === "RETIRED",
        }))}
        account={account}
        campaigns={campaigns}
        campaign={campaign}
        adsets={adsets}
        adset={adset}
        today={today}
      />

      <nav className="flex items-center flex-wrap gap-1 text-sm" aria-label="Drill-down path">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={c.href} className="flex items-center gap-1 min-w-0">
              {i > 0 && <span className="text-ink-3">›</span>}
              {last ? (
                <span className="text-gold truncate max-w-80" title={c.label}>
                  {c.label}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="text-ink-2 hover:text-psi truncate max-w-80"
                  title={c.label}
                >
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <KpiTiles totals={stats.totals} />

      {user.role === "ADMIN" && stats.unmatchedRevenue > 0 && (
        <Link
          href={`/unmatched?from=${from}&to=${to}`}
          className="panel block px-4 py-3 text-sm hover:bg-surface-3 transition-colors"
        >
          <span className="text-warn">⚠ Unmatched revenue in range:</span>{" "}
          <span className="text-ink font-semibold">
            {fmtMoney(stats.unmatchedRevenue)}
          </span>{" "}
          <span className="text-ink-3">
            ({stats.unmatchedConversions} conversions with subids that match no
            known ad — inspect →)
          </span>
        </Link>
      )}

      {stats.daily.length > 1 && <TrendChart daily={stats.daily} />}

      <StatsTable rows={rows} totals={stats.totals} groupBy={groupBy} />
    </div>
  );
}
