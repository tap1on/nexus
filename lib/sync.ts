import { db } from "./db";
import { fetchAdInsights } from "./meta";
import { fetchDailyEntityStats } from "./everflow";
import { todayBerlin, shiftDate, dateRange } from "./dates";

const CHUNK = 200;

async function chunked<T>(items: T[], fn: (batch: T[]) => Promise<void>) {
  for (let i = 0; i < items.length; i += CHUNK) {
    await fn(items.slice(i, i + CHUNK));
  }
}

/** Pull Meta ad-level daily insights for every active ad account. */
export async function syncMeta(lookbackDays: number): Promise<void> {
  const until = todayBerlin();
  const since = shiftDate(until, -(lookbackDays - 1));
  const accounts = await db.adAccount.findMany({
    where: { status: "ACTIVE", bm: { status: "ACTIVE" } },
    include: { bm: true },
  });

  for (const acc of accounts) {
    const run = await db.syncRun.create({
      data: {
        kind: "META",
        targetId: acc.id,
        targetName: `${acc.bm.name} / ${acc.name}`,
        rangeFrom: since,
        rangeTo: until,
      },
    });
    try {
      const rows = await fetchAdInsights(
        acc.bm.systemUserToken,
        acc.metaAccountId,
        since,
        until
      );
      let upserted = 0;
      await chunked(rows, async (batch) => {
        await db.$transaction(
          batch.map((r) =>
            db.metaStat.upsert({
              where: { date_adId: { date: r.date_start, adId: r.ad_id } },
              create: {
                date: r.date_start,
                adAccountId: acc.id,
                campaignId: r.campaign_id,
                campaignName: r.campaign_name,
                adsetId: r.adset_id,
                adsetName: r.adset_name,
                adId: r.ad_id,
                adName: r.ad_name,
                spend: parseFloat(r.spend || "0"),
                impressions: parseInt(r.impressions || "0", 10),
                clicks: parseInt(r.inline_link_clicks || "0", 10),
              },
              update: {
                campaignName: r.campaign_name,
                adsetName: r.adset_name,
                adName: r.ad_name,
                spend: parseFloat(r.spend || "0"),
                impressions: parseInt(r.impressions || "0", 10),
                clicks: parseInt(r.inline_link_clicks || "0", 10),
              },
            })
          )
        );
        upserted += batch.length;
      });
      await db.syncRun.update({
        where: { id: run.id },
        data: {
          status: "OK",
          finishedAt: new Date(),
          rowsUpserted: upserted,
        },
      });
    } catch (e) {
      await db.syncRun.update({
        where: { id: run.id },
        data: {
          status: "ERROR",
          finishedAt: new Date(),
          message: e instanceof Error ? e.message : String(e),
        },
      });
    }
  }
}

/** Pull Everflow entity stats per day per instance (keeps under the 10k row cap). */
export async function syncEverflow(lookbackDays: number): Promise<void> {
  const until = todayBerlin();
  const since = shiftDate(until, -(lookbackDays - 1));
  const days = dateRange(since, until);
  const instances = await db.everflowInstance.findMany({
    where: { status: "ACTIVE" },
  });

  for (const inst of instances) {
    const run = await db.syncRun.create({
      data: {
        kind: "EVERFLOW",
        targetId: inst.id,
        targetName: inst.name,
        rangeFrom: since,
        rangeTo: until,
      },
    });
    try {
      let upserted = 0;
      for (const date of days) {
        const rows = await fetchDailyEntityStats(
          inst.apiKey,
          inst.timezoneId,
          date
        );
        await chunked(rows, async (batch) => {
          await db.$transaction(
            batch.map((r) =>
              db.everflowStat.upsert({
                where: {
                  date_instanceId_campaignId_adsetId_adId_sourceId_offerId: {
                    date,
                    instanceId: inst.id,
                    campaignId: r.campaignId,
                    adsetId: r.adsetId,
                    adId: r.adId,
                    sourceId: r.sourceId,
                    offerId: r.offerId,
                  },
                },
                create: {
                  date,
                  instanceId: inst.id,
                  campaignId: r.campaignId,
                  adsetId: r.adsetId,
                  adId: r.adId,
                  sourceId: r.sourceId,
                  offerId: r.offerId,
                  offerName: r.offerName,
                  clicks: r.clicks,
                  conversions: r.conversions,
                  revenue: r.revenue,
                },
                update: {
                  offerName: r.offerName,
                  clicks: r.clicks,
                  conversions: r.conversions,
                  revenue: r.revenue,
                },
              })
            )
          );
          upserted += batch.length;
        });
      }
      await db.syncRun.update({
        where: { id: run.id },
        data: {
          status: "OK",
          finishedAt: new Date(),
          rowsUpserted: upserted,
        },
      });
    } catch (e) {
      await db.syncRun.update({
        where: { id: run.id },
        data: {
          status: "ERROR",
          finishedAt: new Date(),
          message: e instanceof Error ? e.message : String(e),
        },
      });
    }
  }
}

/** One full sync pass. `lookbackDays` = how many days back to re-pull. */
export async function syncAll(lookbackDays: number): Promise<void> {
  await syncMeta(lookbackDays);
  await syncEverflow(lookbackDays);
}
