"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  name: string;
  keyPreview: string;
  timezoneId: number;
  status: string;
};

export function EverflowManager({ instances }: { instances: Row[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/everflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, apiKey }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed");
      return;
    }
    setName("");
    setApiKey("");
    router.refresh();
  }

  async function patch(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/everflow/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) alert((await res.json()).error ?? "Failed");
    router.refresh();
  }

  function rotateKey(id: string) {
    const k = prompt("New affiliate API key:");
    if (k && k.trim().length >= 10) patch(id, { apiKey: k.trim() });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl text-ink">Everflow Instances</h2>
        <p className="text-ink-3 text-sm">
          One affiliate reporting API key per network. The key is validated on add
          and the Berlin timezone id resolved automatically.
        </p>
      </div>

      <form onSubmit={create} className="panel p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">
            Network Name
          </label>
          <input className="input" required value={name} placeholder="Network X"
            onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex-1 min-w-64">
          <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">
            Affiliate API Key
          </label>
          <input className="input w-full" required minLength={10} value={apiKey}
            onChange={(e) => setApiKey(e.target.value)} />
        </div>
        <button className="btn btn-psi" disabled={busy}>
          {busy ? "Validating…" : "Add Instance"}
        </button>
        {error && <p className="text-bad text-sm w-full">⚠ {error}</p>}
      </form>

      <div className="panel p-2 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Network</th>
              <th style={{ textAlign: "left" }}>API Key</th>
              <th>TZ ID</th>
              <th style={{ textAlign: "left" }}>Status</th>
              <th style={{ textAlign: "left" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((i) => (
              <tr key={i.id}>
                <td style={{ textAlign: "left" }}>{i.name}</td>
                <td style={{ textAlign: "left" }} className="text-ink-3 font-mono text-sm">
                  {i.keyPreview}
                </td>
                <td>{i.timezoneId}</td>
                <td style={{ textAlign: "left" }}
                  className={i.status === "ACTIVE" ? "text-good" : "text-ink-3"}>
                  {i.status === "ACTIVE" ? "✓ Active" : "✕ Retired"}
                </td>
                <td style={{ textAlign: "left" }}>
                  <div className="flex gap-2">
                    <button className="btn text-[0.55rem] px-2 py-1" onClick={() => rotateKey(i.id)}>
                      Rotate Key
                    </button>
                    <button
                      className={`text-[0.55rem] px-2 py-1 ${i.status === "ACTIVE" ? "btn btn-danger" : "btn"}`}
                      onClick={() =>
                        patch(i.id, { status: i.status === "ACTIVE" ? "RETIRED" : "ACTIVE" })
                      }
                    >
                      {i.status === "ACTIVE" ? "Retire" : "Reactivate"}
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
