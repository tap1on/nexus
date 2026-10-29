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
  // Floating creative preview (position: fixed escapes the table's overflow clip).
  const [preview, setPreview] = useState<{ key: string; x: number; y: number } | null>(null);
  const [broken, setBroken] = useState<Set<string>>(new Set());

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
                  {r.media?.thumb && !broken.has(r.key) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/thumb/${r.key}`}
                      alt=""
                      loading="lazy"
                      className="w-8 h-8 object-cover shrink-0 border border-edge cursor-zoom-in"
                      onMouseEnter={(e) =>
                        setPreview({ key: r.key, x: e.clientX, y: e.clientY })
                      }
                      onMouseMove={(e) =>
                        setPreview({ key: r.key, x: e.clientX, y: e.clientY })
                      }
                      onMouseLeave={() => setPreview(null)}
                      onError={() => setBroken((s) => new Set(s).add(r.key))}
                    />
                  )}
                  {r.media?.postUrl ? (
                    <a
                      href={r.media.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink hover:text-psi hover:underline underline-offset-2"
                      title={r.media.isPost ? "Open the Facebook post" : "Open in Ads Manager"}
                    >
                      {r.label} <span className="text-ink-3 text-[0.72rem]">↗</span>
                    </a>
                  ) : r.href ? (
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
      {preview && (
        <div
          className="panel p-1 pointer-events-none"
          style={{
            position: "fixed",
            zIndex: 50,
            // keep the preview inside the viewport: flip left/up near the edges
            left: Math.min(preview.x + 16, window.innerWidth - 336),
            top: Math.min(preview.y + 16, window.innerHeight - 336),
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/thumb/${preview.key}`}
            alt=""
            className="block max-w-80 max-h-80 object-contain"
          />
        </div>
      )}
    </div>
  );
}
