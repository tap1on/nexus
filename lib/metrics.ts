export type MetricRow = {
  key: string;
  label: string;
  sublabel?: string;
  spend: number;
  revenue: number;
  profit: number;
  roi: number | null; // percent
  impressions: number;
  metaClicks: number;
  efClicks: number;
  clickLoss: number | null; // percent of meta clicks that never reached EF
  cpc: number | null;
  cpm: number | null;
  ctr: number | null; // percent
  conversions: number;
  cpa: number | null;
  epc: number | null;
  cvr: number | null; // percent, conversions / EF clicks
};

export type RawTotals = {
  spend: number;
  revenue: number;
  impressions: number;
  metaClicks: number;
  efClicks: number;
  conversions: number;
};

export function emptyTotals(): RawTotals {
  return {
    spend: 0,
    revenue: 0,
    impressions: 0,
    metaClicks: 0,
    efClicks: 0,
    conversions: 0,
  };
}

export function computeMetrics(
  key: string,
  label: string,
  t: RawTotals,
  sublabel?: string
): MetricRow {
  const profit = t.revenue - t.spend;
  return {
    key,
    label,
    sublabel,
    spend: t.spend,
    revenue: t.revenue,
    profit,
    roi: t.spend > 0 ? (profit / t.spend) * 100 : null,
    impressions: t.impressions,
    metaClicks: t.metaClicks,
    efClicks: t.efClicks,
    clickLoss:
      t.metaClicks > 0
        ? ((t.metaClicks - t.efClicks) / t.metaClicks) * 100
        : null,
    cpc: t.metaClicks > 0 ? t.spend / t.metaClicks : null,
    cpm: t.impressions > 0 ? (t.spend / t.impressions) * 1000 : null,
    ctr: t.impressions > 0 ? (t.metaClicks / t.impressions) * 100 : null,
    conversions: t.conversions,
    cpa: t.conversions > 0 ? t.spend / t.conversions : null,
    epc: t.efClicks > 0 ? t.revenue / t.efClicks : null,
    cvr: t.efClicks > 0 ? (t.conversions / t.efClicks) * 100 : null,
  };
}
