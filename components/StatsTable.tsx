"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MetricRow } from "@/lib/metrics";
import { fmtMoney, fmtNum, fmtPct, fmtSigned } from "@/lib/format";

type ColKey = keyof Pick<
  MetricRow,
  | "spend" | "revenue" | "profit" | "roi" | "impressions" | "metaClicks"
  | "efClicks" | "clickLoss" | "cpc" | "cpm" | "ctr" | "conversions"
  | "cpa" | "epc" | "cvr"
>;

const COLS: Array<{ key: ColKey; label: string; fmt: (r: MetricRow) => string }> = [
  { key: "spend", label: "Spend", fmt: (r) => fmtMoney(r.spend) },
  { key: "revenue", label: "Revenue", fmt: (r) => fmtMoney(r.revenue) },
  { key: "profit", label: "Profit", fmt: (r) => fmtSigned(r.profit, (n) => fmtMoney(n)) },
  { key: "roi", label: "ROI", fmt: (r) => (r.roi === null ? "—" : fmtSigned(r.roi, (n) => fmtPct(n))) },
  { key: "impressions", label: "Impr", fmt: (r) => fmtNum(r.impressions) },
  { key: "metaClicks", label: "Meta Clk", fmt: (r) => fmtNum(r.metaClicks) },
  { key: "efClicks", label: "EF Clk", fmt: (r) => fmtNum(r.efClicks) },
  { key: "clickLoss", label: "Clk Loss", fmt: (r) => fmtPct(r.clickLoss) },
  { key: "cpc", label: "CPC", fmt: (r) => fmtMoney(r.cpc, 3) },
  { key: "cpm", label: "CPM", fmt: (r) => fmtMoney(r.cpm) },
  { key: "ctr", label: "CTR", fmt: (r) => fmtPct(r.ctr, 2) },
  { key: "conversions", label: "Conv", fmt: (r) => fmtNum(r.conversions) },
  { key: "cpa", label: "CPA", fmt: (r) => fmtMoney(r.cpa) },
  { key: "epc", label: "EPC", fmt: (r) => fmtMoney(r.epc, 3) },
  { key: "cvr", label: "CVR", fmt: (r) => fmtPct(r.cvr, 2) },
];

const GROUP_LABELS: Record<string, string> = {
  buyer: "Buyer",
  account: "Ad Account",
  campaign: "Campaign",
  adset: "Ad Set",
  ad: "Ad",
  date: "Day",
};

export function StatsTable({
  rows,
  totals,
  groupBy,
}: {
  rows: MetricRow[];
  totals: MetricRow;
  groupBy: string;
}) {
  const [sortKey, setSortKey] = useState<ColKey | "label">("spend");
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sortKey === "label") {
        return desc
          ? b.label.localeCompare(a.label)
          : a.label.localeCompare(b.label);
      }
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return desc ? (bv as number) - (av as number) : (av as number) - (bv as number);
    });
    return copy;
  }, [rows, sortKey, desc]);

  function clickSort(key: ColKey | "label") {
    if (key === sortKey) setDesc(!desc);
    else {
      setSortKey(key);
      setDesc(key !== "label");
    }
  }

  const arrow = (key: string) => (sortKey === key ? (desc ? " ▾" : " ▴") : "");

  if (rows.length === 0) {
    return (
      <div className="panel p-10 text-center text-ink-3">
        <p className="font-display tracking-widest text-sm mb-2">NO DATA IN RANGE</p>
        <p className="text-sm">
          Once the sync worker has pulled Meta and Everflow stats, they appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="panel p-2 overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className={sortKey === "label" ? "sorted" : ""} onClick={() => clickSort("label")}>
              {GROUP_LABELS[groupBy] ?? groupBy}{arrow("label")}
            </th>
            {COLS.map((c) => (
              <th
                key={c.key}
                className={sortKey === c.key ? "sorted" : ""}
                onClick={() => clickSort(c.key)}
              >
                {c.label}{arrow(c.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.key}>
              <td>
                <span className="flex items-center gap-2 min-w-0">
                  {r.href ? (
                    <Link
                      href={r.href}
                      className="text-ink hover:text-psi hover:underline underline-offset-2"
                      title="Drill down"
                    >
                      {r.label} <span className="text-ink-3 text-[0.72rem]">›</span>
                    </Link>
                  ) : (
                    <span className="text-ink">{r.label}</span>
                  )}
                </span>
                {r.sublabel && (
                  <span className="block text-[0.72rem] text-ink-3 max-w-72 truncate">
                    {r.sublabel}
                  </span>
                )}
              </td>
              {COLS.map((c) => {
                const tone =
                  c.key === "profit" || c.key === "roi"
                    ? r.profit > 0
                      ? "text-good"
                      : r.profit < 0
                        ? "text-bad"
                        : ""
                    : "";
                return (
                  <td key={c.key} className={tone}>
                    {c.fmt(r)}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="totals">
            <td>Total ({rows.length})</td>
            {COLS.map((c) => (
              <td key={c.key}>{c.fmt(totals)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
