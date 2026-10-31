# Nexus — Media Buying Tracker

Reconciles **Meta ad spend** (via system user tokens, one per BM) with **Everflow
affiliate revenue** (via affiliate reporting API keys, one per network), matched
per ad through subids. Protoss-themed dashboard for the whole team.

- Spend: Meta Insights API, ad level, daily breakdown
- Revenue: Everflow entity reports grouped by sub1/sub3/sub4, **conversion-date**
  attribution (a conversion counts on the day it fires, not the click day)
- Everything in **Europe/Berlin** time, USD
- Buyers see only the ad accounts assigned to them; admins see everything

## 1. The tracking-link contract (critical)

Every Meta ad must send traffic to an Everflow tracking link carrying these
parameters (Meta URL dynamic macros + the ad account id):

```
&sub1={{campaign.id}}&sub3={{adset.id}}&sub4={{ad.id}}&source_id=<ad account id>&fbclid={fbclid}
```

**Buyers don't build this by hand** — the **Link Generator** page does it:
pick your ad account + offer, copy the full URL into the ad's Website URL
field. Offers are managed by admins on the Everflow page (fetched live from
the Everflow API, or added manually by pasting a tracking URL).

`fbclid={fbclid}` passes the Meta click id to Everflow (single braces, per
Everflow's partner attribution guide) so the network can send Conversions API
events back to Meta. Nexus does not store it.

`source_id` carries the Meta ad account id, so the network can score traffic
quality per account, and Nexus can attribute stray revenue to an account on
the Unmatched page even when the sub macros break.

Matching is strict on **sub4 = ad id**. Revenue whose sub4 doesn't correspond to
a known Meta ad lands on the **Unmatched Revenue** page (admin-only) — that page
is your canary for broken link templates. A literal `{{campaign.id}}` showing up
there means a link was built outside Meta or the macros weren't interpolated.

sub2 and sub5–sub10 are untouched and remain free for other uses.

## 2. Local development

```bash
npm install
npx prisma db push          # creates prisma/data/nexus.db
npm run create-admin -- you@company.com <password> "Your Name"
npm run dev                 # web UI on :3000
npm run worker              # sync worker (separate terminal)
```

Optional demo data to explore the UI: `npm run seed-demo`
(remove with `npm run seed-demo -- --clear`).

## 3. Deploy on a VPS (Docker)

```bash
cp .env.example .env        # fill SESSION_SECRET
docker compose up -d --build
docker compose exec web npm run create-admin -- you@company.com <password> "Your Name"
```

- `web` serves the UI on port 3000 (put your reverse proxy / TLS in front)
- `worker` syncs every `SYNC_INTERVAL_MINUTES` (default 30) with a 7-day
  lookback, plus a nightly 03:30 Berlin deep pass over 30 days so late
  conversions (conversion-date attribution) and Meta spend restatements are
  captured
- The SQLite database lives in the `nexus-data` volume; back it up by copying
  `/app/prisma/data/nexus.db` (it's WAL-mode; `sqlite3 ... ".backup"` is safest)

## 4. Wiring up the integrations (admin UI)

Order matters the first time:

1. **Users** — create your buyers and admins.
2. **Business Managers** — add each BM with its **system user token**.
   The token needs the `ads_read` permission and the ad accounts assigned to the
   system user in Business Settings. Generate: Business Settings → Users →
   System users → Generate token.
3. **Ad Accounts** — pick a BM → **Discover Accounts** (lists everything the
   token can see) → assign an owner (buyer) → Add. Accounts start syncing on the
   next worker pass. Banned/replaced account? **Retire** it — it stops syncing
   but all history stays in reports.
4. **Everflow** — add each network with its **affiliate API key**
   (Everflow partner UI → My Account → API). The key is validated live and the
   Berlin timezone id resolved automatically.

Then check **Sync Status** — every pull per account/instance is logged there
with row counts and errors. Admins can trigger a manual **Sync Now**.

## 5. How matching works (for whoever maintains this)

- `MetaStat`: one row per (date, ad) — spend, impressions, inline link clicks.
- `EverflowStat`: one row per (date, instance, sub1, sub3, sub4, offer) —
  clicks, conversions, payout. Pulled one request per instance per day, which
  stays far below Everflow's 10,000-row response cap.
- Join: EF row → Meta ad via sub4. The ad→campaign/adset/account/buyer context
  comes from the most recent Meta data for that ad (not range-limited, so a
  conversion landing days after the ad stopped spending still attributes).
- Click loss = (Meta link clicks − EF clicks) / Meta clicks: a persistent gap
  means tracking problems or bot filtering.
- Numbers for recent days keep moving between syncs (Meta restates spend, EF
  conversions keep arriving); yesterday is final after the nightly deep pass.

## 5b. Step 1 / Step 2 events

- Some offers fire conversion events before the base Sale (e.g. a lead form,
  then a signup). The sync pulls a second entity report per day grouped by
  `event_name` into `EverflowEventStat`.
- On Admin → Everflow, each API-linked offer has Step 1 / Step 2 dropdowns
  listing the event names seen in synced data (or a custom name). Mapped
  events show as "Step 1" / "Step 2" columns on the dashboard, left of Conv,
  joined to ads via sub4 like revenue. Unmapped events are stored but not shown.
- Manual offers (no Everflow offer id) can't be mapped — reporting rows are
  keyed by the network offer id.

## 6. Scheduled jobs / limits

- Meta: one insights request per ad account per pass (paginated). ~15 accounts
  at 30-min intervals is far inside rate limits. If accounts multiply, raise
  `SYNC_INTERVAL_MINUTES` before anything else.
- Everflow: `FAST_LOOKBACK_DAYS` requests per instance per pass.
- All stat writes are idempotent upserts; re-running a sync is always safe.
