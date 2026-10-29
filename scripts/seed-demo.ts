// Demo data so you can explore the UI before real syncs run.
// Seed:  npm run seed-demo
// Clear: npm run seed-demo -- --clear
import { db } from "../lib/db";
import { hashPassword } from "../lib/auth";
import { todayBerlin, shiftDate } from "../lib/dates";

const DEMO = "DEMO_";

async function clear() {
  await db.everflowStat.deleteMany({
    where: { instance: { name: { startsWith: DEMO } } },
  });
  await db.metaStat.deleteMany({
    where: { adAccount: { name: { startsWith: DEMO } } },
  });
  await db.adAccount.deleteMany({ where: { name: { startsWith: DEMO } } });
  await db.businessManager.deleteMany({ where: { name: { startsWith: DEMO } } });
  await db.everflowInstance.deleteMany({ where: { name: { startsWith: DEMO } } });
  await db.user.deleteMany({ where: { email: { endsWith: "@demo.nexus" } } });
  console.log("Demo data cleared.");
}

async function seed() {
  const buyer1 = await db.user.create({
    data: {
      email: "zeratul@demo.nexus",
      name: "Zeratul (demo)",
      passwordHash: hashPassword("demo-only-no-login-1"),
      role: "BUYER",
    },
  });
  const buyer2 = await db.user.create({
    data: {
      email: "artanis@demo.nexus",
      name: "Artanis (demo)",
      passwordHash: hashPassword("demo-only-no-login-2"),
      role: "BUYER",
    },
  });
  const bm = await db.businessManager.create({
    data: { name: `${DEMO}BM Aiur`, systemUserToken: "DEMO_TOKEN_NOT_REAL_x".repeat(2) },
  });
  const acc1 = await db.adAccount.create({
    data: {
      metaAccountId: "100000000000001",
      name: `${DEMO}Acct Shakuras`,
      bmId: bm.id,
      ownerId: buyer1.id,
    },
  });
  const acc2 = await db.adAccount.create({
    data: {
      metaAccountId: "100000000000002",
      name: `${DEMO}Acct Khala`,
      bmId: bm.id,
      ownerId: buyer2.id,
    },
  });
  const inst = await db.everflowInstance.create({
    data: { name: `${DEMO}Network Templar`, apiKey: "DEMO_KEY_NOT_REAL" },
  });
  await db.offer.create({
    data: {
      instanceId: inst.id,
      networkOfferId: "42",
      name: "Demo Offer — Home Services CPL",
      trackingUrl: "https://trk.demo-network.example/aa11bb",
    },
  });
  await db.offer.create({
    data: {
      instanceId: inst.id,
      name: "Demo Offer — Manual Solar Leads",
      trackingUrl: "https://trk.demo-network.example/cc22dd?aff_sub=x",
    },
  });

  const today = todayBerlin();
  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  let adSeq = 1;

  for (const [acc, nCampaigns] of [
    [acc1, 2],
    [acc2, 2],
  ] as const) {
    for (let c = 1; c <= nCampaigns; c++) {
      const campaignId = `${acc.metaAccountId}${c}00`;
      const campaignName = `${acc.name.replace(DEMO, "")} C${c} | US | CPL`;
      for (let s = 1; s <= 2; s++) {
        const adsetId = `${campaignId}${s}`;
        const adsetName = `AS${s} broad 25-55`;
        for (let a = 1; a <= 3; a++) {
          const adId = `9${String(adSeq++).padStart(12, "0")}`;
          const adName = `AD${a} vid hook ${a}`;
          for (let d = 13; d >= 0; d--) {
            const date = shiftDate(today, -d);
            const spend = rand(20, 120);
            const impressions = Math.round(spend * rand(90, 160));
            const clicks = Math.round(impressions * rand(0.015, 0.04));
            await db.metaStat.create({
              data: {
                date,
                adAccountId: acc.id,
                campaignId,
                campaignName,
                adsetId,
                adsetName,
                adId,
                adName,
                spend,
                impressions,
                clicks,
              },
            });
            const efClicks = Math.round(clicks * rand(0.8, 0.97));
            const conversions = Math.round(efClicks * rand(0.02, 0.09));
            const revenue = conversions * rand(9, 16);
            await db.everflowStat.create({
              data: {
                date,
                instanceId: inst.id,
                campaignId,
                adsetId,
                adId,
                sourceId: acc.metaAccountId,
                offerId: "42",
                offerName: "Demo Offer — Home Services CPL",
                clicks: efClicks,
                conversions,
                revenue,
              },
            });
          }
        }
      }
    }
  }

  // A bit of unmatched revenue (broken subids) for the Unmatched page.
  for (let d = 5; d >= 0; d--) {
    await db.everflowStat.create({
      data: {
        date: shiftDate(today, -d),
        instanceId: inst.id,
        campaignId: "{{campaign.id}}",
        adsetId: "",
        adId: "",
        sourceId: d % 2 === 0 ? acc1.metaAccountId : "",
        offerId: "43",
        offerName: "Demo Offer — Broken Link Template",
        clicks: Math.round(rand(10, 60)),
        conversions: Math.round(rand(1, 4)),
        revenue: rand(15, 80),
      },
    });
  }

  console.log("Demo data seeded (names prefixed DEMO_, users *@demo.nexus).");
}

const wantClear = process.argv.includes("--clear");
(wantClear ? clear() : seed()).finally(() => db.$disconnect());
