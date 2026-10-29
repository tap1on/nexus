"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  name: string;
  status: string;
  tokenPreview: string;
  accounts: number;
};

export function BmManager({ bms }: { bms: Row[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/bms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, systemUserToken: token }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed");
      return;
    }
    setName("");
    setToken("");
    router.refresh();
  }

  async function patch(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/bms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) alert((await res.json()).error ?? "Failed");
    router.refresh();
  }

  function rotateToken(id: string) {
    const t = prompt("New system user token:");
    if (t && t.trim().length >= 20) patch(id, { systemUserToken: t.trim() });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl text-ink">Business Managers</h2>
        <p className="text-ink-3 text-sm">
          One system user token per BM. After adding a BM, discover and add its ad
          accounts on the Ad Accounts page. Retiring a BM stops syncing but keeps
          all historical data.
        </p>
      </div>

      <form onSubmit={create} className="panel p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">BM Name</label>
          <input className="input" required value={name} placeholder="BM Alpha"
            onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex-1 min-w-64">
          <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">
            System User Token
          </label>
          <input className="input w-full" required minLength={20} value={token}
            placeholder="EAAG…" onChange={(e) => setToken(e.target.value)} />
        </div>
        <button className="btn btn-psi" disabled={busy}>Add BM</button>
        {error && <p className="text-bad text-sm w-full">⚠ {error}</p>}
      </form>

      <div className="panel p-2 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Name</th>
              <th style={{ textAlign: "left" }}>Token</th>
              <th>Ad Accounts</th>
              <th style={{ textAlign: "left" }}>Status</th>
              <th style={{ textAlign: "left" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bms.map((b) => (
              <tr key={b.id}>
                <td style={{ textAlign: "left" }}>{b.name}</td>
                <td style={{ textAlign: "left" }} className="text-ink-3 font-mono text-sm">
                  {b.tokenPreview}
                </td>
                <td>{b.accounts}</td>
                <td style={{ textAlign: "left" }}
                  className={b.status === "ACTIVE" ? "text-good" : "text-ink-3"}>
                  {b.status === "ACTIVE" ? "✓ Active" : "✕ Retired"}
                </td>
                <td style={{ textAlign: "left" }}>
                  <div className="flex gap-2">
                    <button className="btn text-[0.55rem] px-2 py-1" onClick={() => rotateToken(b.id)}>
                      Rotate Token
                    </button>
                    <button
                      className={`text-[0.55rem] px-2 py-1 ${b.status === "ACTIVE" ? "btn btn-danger" : "btn"}`}
                      onClick={() =>
                        patch(b.id, { status: b.status === "ACTIVE" ? "RETIRED" : "ACTIVE" })
                      }
                    >
                      {b.status === "ACTIVE" ? "Retire" : "Reactivate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
