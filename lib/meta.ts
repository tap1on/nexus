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

class MetaApiError extends Error {
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
