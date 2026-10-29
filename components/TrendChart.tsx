"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { fmtMoney } from "@/lib/format";

// Recharts needs literal colors, so read the active theme's CSS variables.
// Defaults match the "nexus" theme for the server render.
const DEFAULT_COLORS = {
  spend: "#b98b2d",
  revenue: "#1899cd",
  grid: "rgba(36, 49, 80, 0.6)",
  ink2: "#9aa5bd",
  cursor: "rgba(77, 210, 255, 0.35)",
};

function useThemeColors() {
  const [colors, setColors] = useState(DEFAULT_COLORS);
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (name: string, fallback: string) =>
        s.getPropertyValue(name).trim() || fallback;
      setColors({
        spend: v("--series-spend", DEFAULT_COLORS.spend),
        revenue: v("--series-revenue", DEFAULT_COLORS.revenue),
        grid: v("--chart-grid", DEFAULT_COLORS.grid),
        ink2: v("--ink-2", DEFAULT_COLORS.ink2),
        cursor: v("--chart-cursor", DEFAULT_COLORS.cursor),
      });
    };
    read();
    // Re-read when the theme toggle flips <html data-theme>.
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return colors;
}

type Point = { date: string; spend: number; revenue: number; profit: number };

function endLabel(name: string, color: string, dataLen: number) {
  return function Label(props: {
    x?: number | string;
    y?: number | string;
    index?: number;
  }) {
    if (props.index !== dataLen - 1) return <g />;
    return (
      <text
        x={Number(props.x ?? 0) + 8}
        y={Number(props.y ?? 0)}
        fill={color}
        fontSize={11}
        dominantBaseline="middle"
      >
        {name}
      </text>
    );
  };
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const spend = payload.find((p) => p.name === "Spend")?.value ?? 0;
  const revenue = payload.find((p) => p.name === "Revenue")?.value ?? 0;
  const profit = revenue - spend;
  return (
    <div className="panel p-3 text-sm">
      <p className="text-ink-2 mb-1 font-display text-xs tracking-wider">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex justify-between gap-6">
          <span className="flex items-center gap-1.5 text-ink-2">
            <span
              className="inline-block w-2.5 h-2.5"
              style={{ background: p.color }}
            />
            {p.name}
          </span>
          <span className="text-ink tabular-nums">{fmtMoney(p.value)}</span>
        </p>
      ))}
      <p className="flex justify-between gap-6 border-t border-edge mt-1 pt-1">
        <span className="text-ink-2">Profit</span>
        <span
          className={`tabular-nums ${profit >= 0 ? "text-good" : "text-bad"}`}
        >
          {profit >= 0 ? "+" : ""}
          {fmtMoney(profit)}
        </span>
      </p>
    </div>
  );
}

export function TrendChart({ daily }: { daily: Point[] }) {
  const { spend: SPEND, revenue: REVENUE, grid: GRID, ink2: INK2, cursor } = useThemeColors();
  return (
    <div className="panel p-4">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={daily} margin={{ top: 6, right: 70, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: INK2, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tickFormatter={(d: string) => d.slice(5)}
          />
          <YAxis
            tick={{ fill: INK2, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
            width={52}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: cursor, strokeWidth: 1 }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={24}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: INK2 }}
          />
          <Line
            type="monotone"
            dataKey="spend"
            name="Spend"
            stroke={SPEND}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            label={endLabel("Spend", SPEND, daily.length)}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={REVENUE}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            label={endLabel("Revenue", REVENUE, daily.length)}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
