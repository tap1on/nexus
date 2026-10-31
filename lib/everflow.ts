// Everflow Affiliate API client (one reporting API key per instance/network).
// Docs: https://developers.everflow.io/docs/affiliate/
const BASE = "https://api.eflow.team/v1/affiliates";

export type EfEntityRow = {
  campaignId: string; // sub1 = {{campaign.id}}
  adsetId: string; // sub3 = {{adset.id}}
  adId: string; // sub4 = {{ad.id}}
  sourceId: string; // source_id = meta ad account id
  offerId: string;
  offerName: string;
  clicks: number;
  conversions: number;
  revenue: number; // affiliate payout
};

type EfTableResponse = {
  table?: Array<{
    columns: Array<{ column_type: string; id?: string; label?: string }>;
    reporting: {
      total_click?: number;
      cv?: number;
      event?: number; // post-conversion event count
      revenue?: number;
    };
  }>;
};

function parseColumns(
  entry: NonNullable<EfTableResponse["table"]>[number]
): {
  cols: Record<string, { id?: string; label?: string }>;
  pick: (t: string) => string;
} {
  const cols: Record<string, { id?: string; label?: string }> = {};
  for (const c of entry.columns || []) cols[c.column_type] = c;
  const pick = (t: string) => {
    const c = cols[t];
    const v = (c?.label ?? c?.id ?? "").trim();
    return v === "null" || v === "undefined" ? "" : v;
  };
  return { cols, pick };
}

class EverflowApiError extends Error {}

async function efPost<T>(
  apiKey: string,
  path: string,
  body: unknown
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "X-Eflow-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new EverflowApiError(
      `Everflow API HTTP ${res.status}: ${text.slice(0, 300)}`
    );
  }
  return (await res.json()) as T;
}

/**
 * Entity report for ONE day, grouped by sub1/sub3/sub4 + offer.
 * Querying per-day keeps each response safely under Everflow's 10,000 row cap
 * (rows per day ≈ number of active ads × offers, a few thousand at most).
 */
export async function fetchDailyEntityStats(
  apiKey: string,
  timezoneId: number,
  date: string
): Promise<EfEntityRow[]> {
  const body = {
    from: date,
    to: date,
    timezone_id: timezoneId,
    currency_id: "USD",
    columns: [
      { column: "sub1" },
      { column: "sub3" },
      { column: "sub4" },
      { column: "source_id" },
      { column: "offer" },
    ],
    query: { filters: [] },
  };
  const json = await efPost<EfTableResponse>(
    apiKey,
    "/reporting/entity/table",
    body
  );
  const rows: EfEntityRow[] = [];
  for (const entry of json.table || []) {
    const { cols, pick } = parseColumns(entry);
    rows.push({
      campaignId: pick("sub1"),
      adsetId: pick("sub3"),
      adId: pick("sub4"),
      sourceId: pick("source_id"),
      offerId: (cols["offer"]?.id ?? "").trim(),
      offerName: (cols["offer"]?.label ?? "").trim(),
      clicks: entry.reporting?.total_click ?? 0,
      conversions: entry.reporting?.cv ?? 0,
      revenue: entry.reporting?.revenue ?? 0,
    });
  }
  return rows;
}

export type EfEventRow = {
  campaignId: string;
  adsetId: string;
  adId: string;
  sourceId: string;
  offerId: string;
  event: string; // event_name (base conversions report under their own name too)
  count: number;
};

/**
 * The same entity report additionally grouped by event_name: how often each
 * conversion event fired per subid/offer combination. A separate request so
 * fetchDailyEntityStats keeps its exact totals (clicks/payout attribution
 * across event rows is Everflow's business, not ours).
 */
export async function fetchDailyEventStats(
  apiKey: string,
  timezoneId: number,
  date: string
): Promise<EfEventRow[]> {
  const body = {
    from: date,
    to: date,
    timezone_id: timezoneId,
    currency_id: "USD",
    columns: [
      { column: "sub1" },
      { column: "sub3" },
      { column: "sub4" },
      { column: "source_id" },
      { column: "offer" },
      { column: "event_name" },
    ],
    query: { filters: [] },
  };
  const json = await efPost<EfTableResponse>(
    apiKey,
    "/reporting/entity/table",
    body
  );
  const rows: EfEventRow[] = [];
  for (const entry of json.table || []) {
    const { cols, pick } = parseColumns(entry);
    const event = pick("event_name");
    // The count lives in `cv` for base conversions and `event` for
    // post-conversion events; exactly one is non-zero per row.
    const count = (entry.reporting?.cv ?? 0) + (entry.reporting?.event ?? 0);
    if (!event || count === 0) continue;
    rows.push({
      campaignId: pick("sub1"),
      adsetId: pick("sub3"),
      adId: pick("sub4"),
      sourceId: pick("source_id"),
      offerId: (cols["offer"]?.id ?? "").trim(),
      event,
      count,
    });
  }
  return rows;
}

export type EfRunnableOffer = {
  networkOfferId: string;
  name: string;
  status: string;
  trackingUrl: string;
};

/** All offers the affiliate account is approved to run. */
export async function fetchRunnableOffers(
  apiKey: string
): Promise<EfRunnableOffer[]> {
  const out: EfRunnableOffer[] = [];
  let page = 1;
  for (;;) {
    const res = await fetch(
      `${BASE}/offersrunnable?page=${page}&page_size=100`,
      { headers: { "X-Eflow-API-Key": apiKey }, cache: "no-store" }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new EverflowApiError(
        `Everflow API HTTP ${res.status} on /offersrunnable: ${text.slice(0, 200)}`
      );
    }
    const json = (await res.json()) as {
      offers?: Array<{
        network_offer_id: number;
        name: string;
        offer_status: string;
        tracking_url?: string;
      }>;
      paging?: { page: number; page_size: number; total_count: number };
    };
    for (const o of json.offers || []) {
      out.push({
        networkOfferId: String(o.network_offer_id),
        name: o.name,
        status: o.offer_status,
        trackingUrl: o.tracking_url ?? "",
      });
    }
    const total = json.paging?.total_count ?? out.length;
    if (out.length >= total || (json.offers || []).length === 0) break;
    page++;
  }
  return out;
}

/** Canonical tracking URL for an offer (urlId 0 = default destination). */
export async function fetchOfferTrackingUrl(
  apiKey: string,
  networkOfferId: string
): Promise<string> {
  const res = await fetch(
    `${BASE}/offers/${networkOfferId}/url/0`,
    { headers: { "X-Eflow-API-Key": apiKey }, cache: "no-store" }
  );
  if (!res.ok) {
    throw new EverflowApiError(
      `Everflow API HTTP ${res.status} fetching tracking url for offer ${networkOfferId}`
    );
  }
  const json = (await res.json()) as { url?: string };
  return json.url ?? "";
}

/** Validate an API key / find the timezone id for Europe/Berlin at setup time. */
export async function fetchTimezones(
  apiKey: string
): Promise<Array<{ timezone_id: number; timezone: string }>> {
  const res = await fetch(`https://api.eflow.team/v1/meta/timezones`, {
    headers: { "X-Eflow-API-Key": apiKey },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new EverflowApiError(`Everflow API HTTP ${res.status} on /meta/timezones`);
  }
  const json = (await res.json()) as {
    timezones?: Array<{ timezone_id: number; timezone: string }>;
  };
  return json.timezones || [];
}
