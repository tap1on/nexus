// Meta Marketing API client (system user tokens, one per BM).
const META_API_VERSION = process.env.META_API_VERSION || "v23.0";
const BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export type MetaAdAccount = {
  account_id: string; // numeric, no "act_" prefix
  name: string;
  account_status: number; // 1 = active
  currency: string;
  timezone_name: string;
};

export type MetaInsightRow = {
  date_start: string;
  campaign_id: string;
  campaign_name: string;
  adset_id: string;
  adset_name: string;
  ad_id: string;
  ad_name: string;
  spend?: string;
  impressions?: string;
  inline_link_clicks?: string;
};

export class MetaApiError extends Error {
  constructor(message: string, public code?: number, public status?: number) {
    super(message);
  }
}

async function metaGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number };
  };
  if (!res.ok || json.error) {
    throw new MetaApiError(
      json.error?.message || `Meta API HTTP ${res.status}`,
      json.error?.code,
      res.status
    );
  }
  return json as T;
}

/** List all ad accounts the system user token can see (for discovery in admin UI). */
export async function discoverAdAccounts(
  token: string
): Promise<MetaAdAccount[]> {
  const fields = "account_id,name,account_status,currency,timezone_name";
  let url = `${BASE}/me/adaccounts?fields=${fields}&limit=100&access_token=${encodeURIComponent(token)}`;
  const out: MetaAdAccount[] = [];
  while (url) {
    const page = await metaGet<{
      data: MetaAdAccount[];
      paging?: { next?: string };
    }>(url);
    out.push(...(page.data || []));
    url = page.paging?.next || "";
  }
  return out;
}

export type EntityLevel = "CAMPAIGN" | "ADSET" | "AD";

export type MetaEntityStatusRow = {
  id: string;
  level: EntityLevel;
  status: string; // the entity's own switch: ACTIVE | PAUSED | ARCHIVED | ...
  effective_status: string; // delivery state incl. parent causes: CAMPAIGN_PAUSED, ...
};

const LEVEL_EDGE: Record<EntityLevel, string> = {
  CAMPAIGN: "campaigns",
  ADSET: "adsets",
  AD: "ads",
};

/**
 * Current statuses of all campaigns / ad sets / ads in one account. Meta's
 * listings omit deleted entities, so the caller marks anything it knows about
 * but doesn't get back as DELETED.
 */
export async function fetchEntityStatuses(
  token: string,
  accountId: string
): Promise<MetaEntityStatusRow[]> {
  const out: MetaEntityStatusRow[] = [];
  for (const level of Object.keys(LEVEL_EDGE) as EntityLevel[]) {
    const params = new URLSearchParams({
      fields: "id,status,effective_status",
      limit: "500",
      access_token: token,
    });
    let url = `${BASE}/act_${accountId}/${LEVEL_EDGE[level]}?${params.toString()}`;
    while (url) {
      const page = await metaGet<{
        data: Array<{ id: string; status: string; effective_status: string }>;
        paging?: { next?: string };
      }>(url);
      for (const e of page.data || []) {
        out.push({
          id: e.id,
          level,
          status: e.status,
          effective_status: e.effective_status,
        });
      }
      url = page.paging?.next || "";
    }
  }
  return out;
}

/**
 * Flip a campaign / ad set / ad on or off, then re-read the authoritative
 * statuses (effective_status can stay e.g. CAMPAIGN_PAUSED after resuming an
 * ad whose campaign is off). Requires an ads_management token.
 */
export async function setEntityStatus(
  token: string,
  entityId: string,
  status: "ACTIVE" | "PAUSED"
): Promise<{ status: string; effectiveStatus: string }> {
  const res = await fetch(`${BASE}/${entityId}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ status, access_token: token }).toString(),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number };
  };
  if (!res.ok || json.error) {
    throw new MetaApiError(
      json.error?.message || `Meta API HTTP ${res.status}`,
      json.error?.code,
      res.status
    );
  }
  const fresh = await metaGet<{ status?: string; effective_status?: string }>(
    `${BASE}/${entityId}?fields=status,effective_status&access_token=${encodeURIComponent(token)}`
  );
  return {
    status: fresh.status || status,
    effectiveStatus: fresh.effective_status || status,
  };
}

/**
 * Daily ad-level insights for one account over [since, until] (inclusive,
 * account-timezone dates). Handles pagination.
 */
export async function fetchAdInsights(
  token: string,
  accountId: string,
  since: string,
  until: string
): Promise<MetaInsightRow[]> {
  const fields = [
    "campaign_id",
    "campaign_name",
    "adset_id",
    "adset_name",
    "ad_id",
    "ad_name",
    "spend",
    "impressions",
    "inline_link_clicks",
  ].join(",");
  const params = new URLSearchParams({
    level: "ad",
    fields,
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    limit: "500",
    access_token: token,
  });
  let url = `${BASE}/act_${accountId}/insights?${params.toString()}`;
  const out: MetaInsightRow[] = [];
  while (url) {
    const page = await metaGet<{
      data: MetaInsightRow[];
      paging?: { next?: string };
    }>(url);
    out.push(...(page.data || []));
    url = page.paging?.next || "";
  }
  return out;
}
