"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OfferRow = {
  id: string;
  name: string;
  instanceName: string;
  networkOfferId: string | null;
  trackingUrl: string;
  status: string;
};

type Runnable = {
  networkOfferId: string;
  name: string;
  status: string;
  trackingUrl: string;
  alreadyAdded: boolean;
};

export function OffersPanel({
  instances,
  offers,
}: {
  instances: Array<{ id: string; name: string }>;
  offers: OfferRow[];
}) {
  const router = useRouter();
  const [instanceId, setInstanceId] = useState(instances[0]?.id ?? "");
  const [runnable, setRunnable] = useState<Runnable[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState({ name: "", trackingUrl: "" });

  async function fetchRunnable() {
    if (!instanceId) return;
    setBusy(true);
    setError("");
    setRunnable(null);
    const res = await fetch(`/api/everflow/${instanceId}/offers`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Fetch failed");
      return;
    }
    setRunnable((await res.json()).offers);
  }

  async function addOffer(data: Record<string, unknown>, fromApi?: string) {
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instanceId, ...data }),
    });
    if (!res.ok) {
      const msg = (await res.json()).error ?? "Failed";
      if (fromApi) alert(msg);
      else setError(msg);
      return;
    }
    if (fromApi) {
      setRunnable(
        (r) =>
          r?.map((x) =>
            x.networkOfferId === fromApi ? { ...x, alreadyAdded: true } : x
          ) ?? null
      );
    } else {
      setManual({ name: "", trackingUrl: "" });
    }
    router.refresh();
  }

  async function patch(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/offers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) alert((await res.json()).error ?? "Failed");
    router.refresh();
  }

  function editUrl(o: OfferRow) {
    const url = prompt("Tracking URL:", o.trackingUrl);
    if (url && url.startsWith("http")) patch(o.id, { trackingUrl: url });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl text-ink">Offers</h2>
        <p className="text-ink-3 text-sm">
          Offers power the buyers&apos; Link Generator. Pull them from the Everflow
          API, or add one manually with a pasted tracking URL. Subids and
          source_id are appended automatically at generation time.
        </p>
      </div>

      <div className="panel p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">
              Everflow Instance
            </label>
            <select className="select" value={instanceId}
              onChange={(e) => { setInstanceId(e.target.value); setRunnable(null); }}>
              {instances.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-psi" onClick={fetchRunnable} disabled={busy || !instanceId}>
            {busy ? "Scanning…" : "Fetch Runnable Offers"}
          </button>
          <div className="flex items-end gap-2 ml-auto">
            <div>
              <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">
                Manual: Name
              </label>
              <input className="input" value={manual.name}
                onChange={(e) => setManual({ ...manual, name: e.target.value })} />
            </div>
            <div className="min-w-72">
              <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">
                Tracking URL
              </label>
              <input className="input w-full" value={manual.trackingUrl} placeholder="https://trk.network.com/ab12c3"
                onChange={(e) => setManual({ ...manual, trackingUrl: e.target.value })} />
            </div>
            <button
              className="btn"
              disabled={!manual.name || !manual.trackingUrl || !instanceId}
              onClick={() => addOffer(manual)}
            >
              Add Manual
            </button>
          </div>
        </div>
        {error && <p className="text-bad text-sm">⚠ {error}</p>}

        {runnable && (
          <div className="overflow-x-auto">
            {runnable.length === 0 ? (
              <p className="text-ink-3 text-sm">No runnable offers returned.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Offer</th>
                    <th style={{ textAlign: "left" }}>ID</th>
                    <th style={{ textAlign: "left" }}>EF Status</th>
                    <th style={{ textAlign: "left" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {runnable.map((o) => (
                    <tr key={o.networkOfferId}>
                      <td style={{ textAlign: "left" }} className="max-w-96 truncate">{o.name}</td>
                      <td style={{ textAlign: "left" }} className="font-mono text-sm text-ink-3">
                        {o.networkOfferId}
                      </td>
                      <td style={{ textAlign: "left" }} className="text-ink-2">{o.status}</td>
                      <td style={{ textAlign: "left" }}>
                        {o.alreadyAdded ? (
                          <span className="text-ink-3 text-sm">Added</span>
                        ) : (
                          <button
                            className="btn btn-psi text-[0.55rem] px-2 py-1"
                            onClick={() =>
                              addOffer(
                                {
                                  name: o.name,
                                  networkOfferId: o.networkOfferId,
                                  ...(o.trackingUrl ? { trackingUrl: o.trackingUrl } : {}),
                                },
                                o.networkOfferId
                              )
                            }
                          >
                            Add
                          </button>
                        )}
                      </td>
                    </tr>
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
              <th style={{ textAlign: "left" }}>Offer</th>
              <th style={{ textAlign: "left" }}>Network</th>
              <th style={{ textAlign: "left" }}>EF Offer ID</th>
              <th style={{ textAlign: "left" }}>Tracking URL</th>
              <th style={{ textAlign: "left" }}>Status</th>
              <th style={{ textAlign: "left" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "left" }} className="text-ink-3">
                No offers yet — fetch or add some above.
              </td></tr>
            )}
            {offers.map((o) => (
              <tr key={o.id}>
                <td style={{ textAlign: "left" }}>{o.name}</td>
                <td style={{ textAlign: "left" }} className="text-ink-2">{o.instanceName}</td>
                <td style={{ textAlign: "left" }} className="font-mono text-sm text-ink-3">
                  {o.networkOfferId ?? "manual"}
                </td>
                <td style={{ textAlign: "left" }} className="max-w-72 truncate text-ink-3" title={o.trackingUrl}>
                  {o.trackingUrl}
                </td>
                <td style={{ textAlign: "left" }}
                  className={o.status === "ACTIVE" ? "text-good" : "text-ink-3"}>
                  {o.status === "ACTIVE" ? "✓ Active" : "✕ Archived"}
                </td>
                <td style={{ textAlign: "left" }}>
                  <div className="flex gap-2">
                    <button className="btn text-[0.55rem] px-2 py-1" onClick={() => editUrl(o)}>
                      Edit URL
                    </button>
                    <button
                      className={`text-[0.55rem] px-2 py-1 ${o.status === "ACTIVE" ? "btn btn-danger" : "btn"}`}
                      onClick={() =>
                        patch(o.id, { status: o.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE" })
                      }
                    >
                      {o.status === "ACTIVE" ? "Archive" : "Restore"}
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
