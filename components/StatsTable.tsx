"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MetricRow } from "@/lib/metrics";
import { fmtMoney, fmtNum, fmtPct, fmtSigned } from "@/lib/format";

type ColKey = keyof Pick<
  MetricRow,
  | "spend" | "revenue" | "profit" | "roi" | "impressions" | "metaClicks"
  | "cpc" | "cpm" | "ctr" | "step1" | "step2"
  | "conversions" | "cpa" | "epc" | "cvr"
>;

const COLS: Array<{ key: ColKey; label: string; fmt: (r: MetricRow) => string }> = [
  { key: "spend", label: "Spend", fmt: (r) => fmtMoney(r.spend) },
  { key: "revenue", label: "Revenue", fmt: (r) => fmtMoney(r.revenue) },
  { key: "profit", label: "Profit", fmt: (r) => fmtSigned(r.profit, (n) => fmtMoney(n)) },
  { key: "roi", label: "ROI", fmt: (r) => (r.roi === null ? "—" : fmtSigned(r.roi, (n) => fmtPct(n))) },
  { key: "impressions", label: "Impr", fmt: (r) => fmtNum(r.impressions) },
  { key: "metaClicks", label: "Clicks", fmt: (r) => fmtNum(r.metaClicks) },
  { key: "cpc", label: "CPC", fmt: (r) => fmtMoney(r.cpc, 3) },
  { key: "cpm", label: "CPM", fmt: (r) => fmtMoney(r.cpm) },
  { key: "ctr", label: "CTR", fmt: (r) => fmtPct(r.ctr, 2) },
  { key: "step1", label: "Step 1", fmt: (r) => fmtNum(r.step1) },
  { key: "step2", label: "Step 2", fmt: (r) => fmtNum(r.step2) },
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

/** Groupings whose row key is a Meta entity id with an on/off switch. */
const STATUSED_GROUPS = new Set(["campaign", "adset", "ad"]);

function statusDisplay(effective: string): { text: string; tone: string } {
  switch (effective) {
    case "ACTIVE":
      return { text: "Active", tone: "text-good" };
    case "PAUSED":
      return { text: "Paused", tone: "text-ink-3" };
    case "CAMPAIGN_PAUSED":
      return { text: "Paused (campaign)", tone: "text-ink-3" };
    case "ADSET_PAUSED":
      return { text: "Paused (ad set)", tone: "text-ink-3" };
    case "DELETED":
    case "ARCHIVED":
      return { text: "Deleted", tone: "text-bad" };
    case "":
      return { text: "—", tone: "text-ink-3" };
    default:
      // DISAPPROVED, WITH_ISSUES, PENDING_REVIEW, IN_PROCESS, ...
      return {
        text: effective.toLowerCase().replace(/_/g, " "),
        tone: "text-warn",
      };
  }
}

type EntityState = { status: string; effectiveStatus: string };

export function StatsTable({
  rows,
  totals,
  groupBy,
}: {
  rows: MetricRow[];
  totals: MetricRow;
  groupBy: string;
}) {
  const [sortKey, setSortKey] = useState<ColKey | "label" | "status">("spend");
  const [desc, setDesc] = useState(true);
  // Local status overrides after a pause/resume, keyed by entity id.
  const [overrides, setOverrides] = useState<Record<string, EntityState>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const showStatus = STATUSED_GROUPS.has(groupBy);

  const entityState = (r: MetricRow): EntityState | null => {
    if (!r.entity) return null;
    return overrides[r.entity.id] ?? r.entity;
  };

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sortKey === "label") {
        return desc
          ? b.label.localeCompare(a.label)
          : a.label.localeCompare(b.label);
      }
      if (sortKey === "status") {
        const av = a.entity ? (overrides[a.entity.id] ?? a.entity).effectiveStatus : "";
        const bv = b.entity ? (overrides[b.entity.id] ?? b.entity).effectiveStatus : "";
        return desc ? bv.localeCompare(av) : av.localeCompare(bv);
      }
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return desc ? (bv as number) - (av as number) : (av as number) - (bv as number);
    });
    return copy;
  }, [rows, sortKey, desc, overrides]);

  function clickSort(key: ColKey | "label" | "status") {
    if (key === sortKey) setDesc(!desc);
    else {
      setSortKey(key);
      setDesc(key !== "label" && key !== "status");
    }
  }

  async function toggle(entityId: string, action: "pause" | "resume") {
    setBusyIds((prev) => new Set(prev).add(entityId));
    setError(null);
    try {
      const res = await fetch("/api/meta/entity-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, action }),
      });
      const json = (await res.json().catch(() => ({}))) as Partial<EntityState> & {
        error?: string;
      };
      if (!res.ok || !json.status) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setOverrides((prev) => ({
        ...prev,
        [entityId]: {
          status: json.status!,
          effectiveStatus: json.effectiveStatus || json.status!,
        },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(entityId);
        return next;
      });
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
      {error && (
        <p className="text-bad text-sm px-2 py-1" role="alert">
          ⚠ {error}
        </p>
      )}
      <table className="data-table">
        <thead>
          <tr>
            <th className={sortKey === "label" ? "sorted" : ""} onClick={() => clickSort("label")}>
              {GROUP_LABELS[groupBy] ?? groupBy}{arrow("label")}
            </th>
            {showStatus && (
              <th
                className={sortKey === "status" ? "sorted" : ""}
                onClick={() => clickSort("status")}
              >
                Status{arrow("status")}
              </th>
            )}
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
          {sorted.map((r) => {
            const es = entityState(r);
            const busy = r.entity ? busyIds.has(r.entity.id) : false;
            // The toggle flips the entity's own switch; parents may still
            // keep it from delivering (shown as "Paused (campaign)" etc).
            const canToggle =
              es !== null && (es.status === "ACTIVE" || es.status === "PAUSED");
            const disp = es ? statusDisplay(es.effectiveStatus) : statusDisplay("");
            return (
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
                {showStatus && (
                  <td>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className={disp.tone}>{disp.text}</span>
                      {canToggle && (
                        <button
                          type="button"
                          className={`btn btn-row ${es.status === "ACTIVE" ? "" : "btn-psi"}`}
                          disabled={busy}
                          onClick={() =>
                            toggle(
                              r.entity!.id,
                              es.status === "ACTIVE" ? "pause" : "resume"
                            )
                          }
                          title={
                            es.status === "ACTIVE"
                              ? `Pause this ${groupBy === "adset" ? "ad set" : groupBy}`
                              : `Resume this ${groupBy === "adset" ? "ad set" : groupBy}`
                          }
                        >
                          {busy ? "…" : es.status === "ACTIVE" ? "❚❚ Pause" : "▶ Resume"}
                        </button>
                      )}
                    </span>
                  </td>
                )}
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
            );
          })}
          <tr className="totals">
            <td>Total ({rows.length})</td>
            {showStatus && <td />}
            {COLS.map((c) => (
              <td key={c.key}>{c.fmt(totals)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
