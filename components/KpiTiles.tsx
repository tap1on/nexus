import { MetricRow } from "@/lib/metrics";
import { fmtMoney, fmtPct, fmtSigned } from "@/lib/format";

export function KpiTiles({ totals }: { totals: MetricRow }) {
  const profitTone =
    totals.profit > 0 ? "text-good" : totals.profit < 0 ? "text-bad" : "text-ink";
  const tiles = [
    { label: "Spend", value: fmtMoney(totals.spend), tone: "text-ink" },
    { label: "Revenue", value: fmtMoney(totals.revenue), tone: "text-ink" },
    {
      label: "Profit",
      value: fmtSigned(totals.profit, (n) => fmtMoney(n)),
      tone: profitTone,
    },
    {
      label: "ROI",
      value:
        totals.roi === null ? "—" : fmtSigned(totals.roi, (n) => fmtPct(n)),
      tone: profitTone,
    },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="panel p-4">
          <p className="text-[0.62rem] text-ink-3 uppercase tracking-[0.2em] mb-1">
            {t.label}
          </p>
          <p className={`text-2xl font-display ${t.tone}`}>{t.value}</p>
        </div>
      ))}
    </div>
  );
}
