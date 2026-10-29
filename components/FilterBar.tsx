"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function shiftDate(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const GROUPS = [
  { value: "buyer", label: "Buyer" },
  { value: "account", label: "Ad Account" },
  { value: "campaign", label: "Campaign" },
  { value: "adset", label: "Ad Set" },
  { value: "ad", label: "Ad" },
  { value: "date", label: "Day" },
];

type Params = {
  from: string;
  to: string;
  group: string;
  buyer: string;
  account: string;
  campaign: string;
  adset: string;
};

type Option = { id: string; name: string };

export function FilterBar({
  from,
  to,
  groupBy,
  buyers,
  buyer,
  accounts,
  account,
  campaigns,
  campaign,
  adsets,
  adset,
  today,
}: {
  from: string;
  to: string;
  groupBy: string;
  buyers: Option[];
  buyer?: string; // undefined = non-admin (no buyer filter shown)
  accounts: Array<Option & { retired: boolean }>;
  account: string; // "" = all accounts in scope
  campaigns: Option[]; // campaigns of the selected account (empty when none)
  campaign: string;
  adsets: Option[]; // adsets of the selected campaign (empty when none)
  adset: string;
  today: string;
}) {
  const router = useRouter();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  function apply(params: Partial<Params>) {
    const merged: Params = {
      from: params.from ?? f,
      to: params.to ?? t,
      group: params.group ?? groupBy,
      buyer: params.buyer ?? buyer ?? "",
      account: params.account ?? account,
      campaign: params.campaign ?? campaign,
      adset: params.adset ?? adset,
    };
    const qs = new URLSearchParams();
    qs.set("from", merged.from);
    qs.set("to", merged.to);
    qs.set("group", merged.group);
    for (const k of ["buyer", "account", "campaign", "adset"] as const) {
      if (merged[k]) qs.set(k, merged[k]);
    }
    router.push(`/?${qs.toString()}`);
  }

  const presets: Array<{ label: string; from: string; to: string }> = [
    { label: "Today", from: today, to: today },
    { label: "Yesterday", from: shiftDate(today, -1), to: shiftDate(today, -1) },
    { label: "7D", from: shiftDate(today, -6), to: today },
    { label: "30D", from: shiftDate(today, -29), to: today },
    { label: "MTD", from: today.slice(0, 8) + "01", to: today },
  ];

  return (
    <div className="panel p-3 flex flex-wrap items-center gap-2">
      {presets.map((p) => {
        const active = from === p.from && to === p.to;
        return (
          <button
            key={p.label}
            className={`btn text-[0.6rem] px-3 py-2 ${active ? "btn-psi" : ""}`}
            onClick={() => {
              setF(p.from);
              setT(p.to);
              apply({ from: p.from, to: p.to });
            }}
          >
            {p.label}
          </button>
        );
      })}
      <div className="flex items-center gap-1 ml-1">
        <input
          type="date"
          className="input text-sm"
          value={f}
          max={today}
          onChange={(e) => setF(e.target.value)}
        />
        <span className="text-ink-3">→</span>
        <input
          type="date"
          className="input text-sm"
          value={t}
          max={today}
          onChange={(e) => setT(e.target.value)}
        />
        <button className="btn text-[0.6rem] px-3 py-2" onClick={() => apply({})}>
          Apply
        </button>
      </div>

      {/* Drill filters cascade like Ads Manager: picking a level clears the
          levels below it and shows the next level's rows. */}
      <div className="flex items-center gap-2 ml-auto flex-wrap">
        {buyer !== undefined && (
          <select
            className="select text-sm"
            value={buyer}
            onChange={(e) =>
              apply({ buyer: e.target.value, account: "", campaign: "", adset: "", group: "account" })
            }
          >
            <option value="">All buyers</option>
            {buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <select
          className="select text-sm max-w-56"
          value={account}
          onChange={(e) =>
            apply({
              account: e.target.value,
              campaign: "",
              adset: "",
              group: e.target.value ? "campaign" : "account",
            })
          }
        >
          <option value="">All ad accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.retired ? " (retired)" : ""}
            </option>
          ))}
        </select>
        {account && (
          <select
            className="select text-sm max-w-56"
            value={campaign}
            onChange={(e) =>
              apply({
                campaign: e.target.value,
                adset: "",
                group: e.target.value ? "adset" : "campaign",
              })
            }
          >
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {campaign && (
          <select
            className="select text-sm max-w-56"
            value={adset}
            onChange={(e) =>
              apply({ adset: e.target.value, group: e.target.value ? "ad" : "adset" })
            }
          >
            <option value="">All ad sets</option>
            {adsets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
        <label className="text-[0.65rem] text-ink-3 uppercase tracking-wider">
          Group by
        </label>
        <select
          className="select text-sm"
          value={groupBy}
          onChange={(e) => apply({ group: e.target.value })}
        >
          {GROUPS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
