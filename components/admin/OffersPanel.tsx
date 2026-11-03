"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OfferRow = {
  id: string;
  name: string;
  instanceName: string;
  networkOfferId: string | null;
  networkUrlId: string;
  trackingUrl: string;
  status: string;
  step1Event: string;
  step2Event: string;
  /** event names seen in synced reporting data for this offer */
  events: string[];
};

function StepSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const opts = [...new Set([...options, ...(value ? [value] : [])])].sort();
  return (
    <select
      className="select text-xs"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "__custom__") {
          const name = prompt(
            "Everflow event name (exactly as it appears in reporting):",
            value
          );
          if (name !== null) onChange(name.trim());
        } else {
          onChange(v);
        }
      }}
    >
      <option value="">—</option>
      {opts.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
      <option value="__custom__">Custom…</option>
    </select>
  );
}

type Runnable = {
  networkOfferId: string;
  name: string;
  status: string;
  trackingUrl: string;
  /** destination URL ids already added for this offer ("" = default URL) */
  addedUrlIds: string[];
};

type OfferUrl = { urlId: string; name: string };

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
  const [manual, setManual] = useState({ name: "", offerId: "", trackingUrl: "" });
  // Destination URLs per EF offer id: undefined = not fetched, "loading", or the list
  const [urls, setUrls] = useState<Record<string, OfferUrl[] | "loading">>({});
  // URL picked in each offer's dropdown ("" = default)
  const [urlSel, setUrlSel] = useState<Record<string, string>>({});

  async function fetchRunnable() {
    if (!instanceId) return;
    setBusy(true);
    setError("");
    setRunnable(null);
    setUrls({});
    setUrlSel({});
    const res = await fetch(`/api/everflow/${instanceId}/offers`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Fetch failed");
      return;
    }
    setRunnable((await res.json()).offers);
  }

  async function fetchUrls(networkOfferId: string) {
    setUrls((u) => ({ ...u, [networkOfferId]: "loading" }));
    const res = await fetch(
      `/api/everflow/${instanceId}/offers/${networkOfferId}/urls`,
      { method: "POST" }
    );
    if (!res.ok) {
      setUrls((u) => {
        const next = { ...u };
        delete next[networkOfferId];
        return next;
      });
      alert((await res.json()).error ?? "Failed to load URLs");
      return;
    }
    const json = (await res.json()) as { urls: OfferUrl[] };
    setUrls((u) => ({ ...u, [networkOfferId]: json.urls }));
  }

  /** fromApi = the EF offer id when adding from the runnable list */
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
      const urlId = (data.networkUrlId as string | undefined) ?? "";
      setRunnable(
        (r) =>
          r?.map((x) =>
            x.networkOfferId === fromApi
              ? { ...x, addedUrlIds: [...x.addedUrlIds, urlId] }
              : x
          ) ?? null
      );
    } else {
      setManual({ name: "", offerId: "", trackingUrl: "" });
      setError("");
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

  function rename(o: OfferRow) {
    const name = prompt("Offer name:", o.name)?.trim();
    if (name && name !== o.name) patch(o.id, { name });
  }

  function editUrl(o: OfferRow) {
    const url = prompt("Tracking URL:", o.trackingUrl);
    if (url && url.startsWith("http")) patch(o.id, { trackingUrl: url });
  }

  function setEfId(o: OfferRow) {
    const id = prompt(
      "Everflow offer id (numeric — enables Step 1 / Step 2 event mapping):",
      o.networkOfferId ?? ""
    )?.trim();
    if (!id) return;
    if (!/^\d+$/.test(id)) {
      alert("The Everflow offer id is numeric, e.g. 123");
      return;
    }
    patch(o.id, { networkOfferId: id });
  }

  function addFromRunnable(o: Runnable) {
    const sel = urlSel[o.networkOfferId] ?? "";
    const loaded = urls[o.networkOfferId];
    const urlName =
      sel && Array.isArray(loaded)
        ? loaded.find((u) => u.urlId === sel)?.name
        : undefined;
    addOffer(
      {
        name: urlName ? `${o.name} — ${urlName}` : o.name,
        networkOfferId: o.networkOfferId,
        ...(sel
          ? { networkUrlId: sel } // server fetches this URL's tracking link
          : o.trackingUrl
            ? { trackingUrl: o.trackingUrl }
            : {}),
      },
      o.networkOfferId
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl text-ink">Offers</h2>
        <p className="text-ink-3 text-sm">
          Offers power the buyers&apos; Link Generator. Pull them from the Everflow
          API, or add one manually with a pasted tracking URL. Subids and
          source_id are appended automatically at generation time. An offer with
          several landing pages can be added once per URL (the URLs button) —
          each becomes its own entry. Map an offer&apos;s funnel events to
          Step 1 / Step 2 below and they show as columns on the dashboard, next
          to Conv; the dropdowns list event names seen in synced data. Manual
          offers can be mapped too once their Everflow offer id is set.
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
          <div className="flex flex-wrap items-end gap-2 ml-auto">
            <div>
              <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">
                Manual: Name
              </label>
              <input className="input" value={manual.name}
                onChange={(e) => setManual({ ...manual, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1"
                title="Optional — enables Step 1 / Step 2 event mapping">
                EF Offer ID
              </label>
              <input className="input w-24" value={manual.offerId} placeholder="123"
                inputMode="numeric"
                onChange={(e) => setManual({ ...manual, offerId: e.target.value.trim() })} />
            </div>
            <div className="min-w-0 flex-1 sm:min-w-72">
              <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">
                Tracking URL
              </label>
              <input className="input w-full" value={manual.trackingUrl} placeholder="https://trk.network.com/ab12c3"
                onChange={(e) => setManual({ ...manual, trackingUrl: e.target.value })} />
            </div>
            <button
              className="btn"
              disabled={
                !manual.name ||
                !manual.trackingUrl ||
                !instanceId ||
                (!!manual.offerId && !/^\d+$/.test(manual.offerId))
              }
              onClick={() =>
                addOffer({
                  name: manual.name,
                  trackingUrl: manual.trackingUrl,
                  ...(manual.offerId ? { networkOfferId: manual.offerId } : {}),
                })
              }
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
                  {runnable.map((o) => {
                    const loaded = urls[o.networkOfferId];
                    const sel = urlSel[o.networkOfferId] ?? "";
                    const selAdded = o.addedUrlIds.includes(sel);
                    return (
                      <tr key={o.networkOfferId}>
                        <td style={{ textAlign: "left" }} className="max-w-96 truncate">{o.name}</td>
                        <td style={{ textAlign: "left" }} className="font-mono text-sm text-ink-3">
                          {o.networkOfferId}
                        </td>
                        <td style={{ textAlign: "left" }} className="text-ink-2">{o.status}</td>
                        <td style={{ textAlign: "left" }}>
                          <div className="flex items-center gap-2">
                            {Array.isArray(loaded) && loaded.length > 0 && (
                              <select
                                className="select text-xs max-w-48"
                                value={sel}
                                onChange={(e) =>
                                  setUrlSel((s) => ({ ...s, [o.networkOfferId]: e.target.value }))
                                }
                              >
                                <option value="">Default URL</option>
                                {loaded.map((u) => (
                                  <option key={u.urlId} value={u.urlId}>
                                    {u.name}
                                    {o.addedUrlIds.includes(u.urlId) ? " (added)" : ""}
                                  </option>
                                ))}
                              </select>
                            )}
                            {selAdded ? (
                              <span className="text-ink-3 text-sm">Added</span>
                            ) : (
                              <button
                                className="btn btn-psi text-[0.55rem] px-2 py-1"
                                onClick={() => addFromRunnable(o)}
                              >
                                Add
                              </button>
                            )}
                            {loaded === undefined && (
                              <button
                                className="btn text-[0.55rem] px-2 py-1"
                                title="List this offer's landing-page URLs"
                                onClick={() => fetchUrls(o.networkOfferId)}
                              >
                                URLs…
                              </button>
                            )}
                            {loaded === "loading" && (
                              <span className="text-ink-3 text-xs">loading URLs…</span>
                            )}
                            {Array.isArray(loaded) && loaded.length === 0 && (
                              <span className="text-ink-3 text-xs">no extra URLs</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
              <th style={{ textAlign: "left" }}>Step 1 Event</th>
              <th style={{ textAlign: "left" }}>Step 2 Event</th>
              <th style={{ textAlign: "left" }}>Status</th>
              <th style={{ textAlign: "left" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "left" }} className="text-ink-3">
                No offers yet — fetch or add some above.
              </td></tr>
            )}
            {offers.map((o) => (
              <tr key={o.id}>
                <td style={{ textAlign: "left" }}>{o.name}</td>
                <td style={{ textAlign: "left" }} className="text-ink-2">{o.instanceName}</td>
                <td style={{ textAlign: "left" }} className="font-mono text-sm text-ink-3"
                  title={o.networkUrlId ? `Destination URL ${o.networkUrlId}` : undefined}>
                  {o.networkOfferId ?? "manual"}
                  {o.networkUrlId ? ` · url ${o.networkUrlId}` : ""}
                </td>
                <td style={{ textAlign: "left" }} className="max-w-72 truncate text-ink-3" title={o.trackingUrl}>
                  {o.trackingUrl}
                </td>
                {o.networkOfferId ? (
                  <>
                    <td style={{ textAlign: "left" }}>
                      <StepSelect
                        value={o.step1Event}
                        options={o.events}
                        onChange={(v) => patch(o.id, { step1Event: v })}
                      />
                    </td>
                    <td style={{ textAlign: "left" }}>
                      <StepSelect
                        value={o.step2Event}
                        options={o.events}
                        onChange={(v) => patch(o.id, { step2Event: v })}
                      />
                    </td>
                  </>
                ) : (
                  <td colSpan={2} style={{ textAlign: "left" }}
                    className="text-ink-3 text-xs"
                    title="Step mapping needs the Everflow offer id — use Set EF ID in Actions">
                    needs EF offer id
                  </td>
                )}
                <td style={{ textAlign: "left" }}
                  className={o.status === "ACTIVE" ? "text-good" : "text-ink-3"}>
                  {o.status === "ACTIVE" ? "✓ Active" : "✕ Archived"}
                </td>
                <td style={{ textAlign: "left" }}>
                  <div className="flex gap-2">
                    <button className="btn text-[0.55rem] px-2 py-1" onClick={() => rename(o)}>
                      Rename
                    </button>
                    <button className="btn text-[0.55rem] px-2 py-1" onClick={() => editUrl(o)}>
                      Edit URL
                    </button>
                    {!o.networkOfferId && (
                      <button className="btn text-[0.55rem] px-2 py-1" onClick={() => setEfId(o)}>
                        Set EF ID
                      </button>
                    )}
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
