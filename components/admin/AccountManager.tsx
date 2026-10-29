"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  metaAccountId: string;
  name: string;
  bmName: string;
  ownerId: string;
  status: string;
  currency: string;
  timezone: string;
};

type Discovered = {
  metaAccountId: string;
  name: string;
  currency: string;
  timezone: string;
  active: boolean;
  alreadyAdded: boolean;
};

export function AccountManager({
  accounts,
  bms,
  buyers,
}: {
  accounts: Account[];
  bms: Array<{ id: string; name: string }>;
  buyers: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [bmId, setBmId] = useState(bms[0]?.id ?? "");
  const [discovered, setDiscovered] = useState<Discovered[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function discover() {
    if (!bmId) return;
    setBusy(true);
    setError("");
    setDiscovered(null);
    const res = await fetch(`/api/bms/${bmId}/discover`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Discovery failed");
      return;
    }
    setDiscovered((await res.json()).accounts);
  }

  async function add(acc: Discovered, ownerId: string) {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bmId,
        metaAccountId: acc.metaAccountId,
        name: acc.name,
        currency: acc.currency,
        timezone: acc.timezone,
        ownerId: ownerId || null,
      }),
    });
    if (!res.ok) {
      alert((await res.json()).error ?? "Failed");
      return;
    }
    setDiscovered(
      (d) =>
        d?.map((x) =>
          x.metaAccountId === acc.metaAccountId ? { ...x, alreadyAdded: true } : x
        ) ?? null
    );
    router.refresh();
  }

  async function patch(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) alert((await res.json()).error ?? "Failed");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl text-ink">Ad Accounts</h2>
        <p className="text-ink-3 text-sm">
          Discover accounts via a BM&apos;s system user token, assign an owner, and
          they start syncing on the next worker pass.
        </p>
      </div>

      <div className="panel p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">
              Business Manager
            </label>
            <select className="select" value={bmId} onChange={(e) => setBmId(e.target.value)}>
              {bms.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-psi" onClick={discover} disabled={busy || !bmId}>
            {busy ? "Scanning…" : "Discover Accounts"}
          </button>
          {error && <p className="text-bad text-sm w-full">⚠ {error}</p>}
        </div>

        {discovered && (
          <div className="mt-4 overflow-x-auto">
            {discovered.length === 0 ? (
              <p className="text-ink-3 text-sm">Token sees no ad accounts.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Account</th>
                    <th style={{ textAlign: "left" }}>ID</th>
                    <th style={{ textAlign: "left" }}>Currency / TZ</th>
                    <th style={{ textAlign: "left" }}>Meta Status</th>
                    <th style={{ textAlign: "left" }}>Owner → Add</th>
                  </tr>
                </thead>
                <tbody>
                  {discovered.map((d) => (
                    <DiscoveredRow key={d.metaAccountId} d={d} buyers={buyers} onAdd={add} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div className="panel p-2 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Account</th>
              <th style={{ textAlign: "left" }}>ID</th>
              <th style={{ textAlign: "left" }}>BM</th>
              <th style={{ textAlign: "left" }}>Owner</th>
              <th style={{ textAlign: "left" }}>Status</th>
              <th style={{ textAlign: "left" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td style={{ textAlign: "left" }}>{a.name}</td>
                <td style={{ textAlign: "left" }} className="text-ink-3 font-mono text-sm">
                  {a.metaAccountId}
                </td>
                <td style={{ textAlign: "left" }} className="text-ink-2">{a.bmName}</td>
                <td style={{ textAlign: "left" }}>
                  <select
                    className="select text-sm py-1"
                    value={a.ownerId}
                    onChange={(e) => patch(a.id, { ownerId: e.target.value || null })}
                  >
                    <option value="">Unassigned</option>
                    {buyers.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </td>
                <td style={{ textAlign: "left" }}
                  className={a.status === "ACTIVE" ? "text-good" : "text-ink-3"}>
                  {a.status === "ACTIVE" ? "✓ Active" : "✕ Retired"}
                </td>
                <td style={{ textAlign: "left" }}>
                  <button
                    className={`text-[0.55rem] px-2 py-1 ${a.status === "ACTIVE" ? "btn btn-danger" : "btn"}`}
                    onClick={() =>
                      patch(a.id, { status: a.status === "ACTIVE" ? "RETIRED" : "ACTIVE" })
                    }
                  >
                    {a.status === "ACTIVE" ? "Retire" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DiscoveredRow({
  d,
  buyers,
  onAdd,
}: {
  d: Discovered;
  buyers: Array<{ id: string; name: string }>;
  onAdd: (d: Discovered, ownerId: string) => void;
}) {
  const [ownerId, setOwnerId] = useState("");
  return (
    <tr>
      <td style={{ textAlign: "left" }}>{d.name}</td>
      <td style={{ textAlign: "left" }} className="text-ink-3 font-mono text-sm">
        {d.metaAccountId}
      </td>
      <td style={{ textAlign: "left" }} className="text-ink-2">
        {d.currency} / {d.timezone}
      </td>
      <td style={{ textAlign: "left" }} className={d.active ? "text-good" : "text-warn"}>
        {d.active ? "✓ Active" : "⚠ Inactive"}
      </td>
      <td style={{ textAlign: "left" }}>
        {d.alreadyAdded ? (
          <span className="text-ink-3 text-sm">Already added</span>
        ) : (
          <div className="flex gap-2">
            <select className="select text-sm py-1" value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">Unassigned</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <button className="btn btn-psi text-[0.55rem] px-2 py-1" onClick={() => onAdd(d, ownerId)}>
              Add
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
