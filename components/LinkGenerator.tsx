"use client";

import { useState } from "react";
import { buildTrackingLink } from "@/lib/links";

export function LinkGenerator({
  accounts,
  offers,
}: {
  accounts: Array<{ id: string; metaAccountId: string; label: string }>;
  offers: Array<{ id: string; label: string; trackingUrl: string }>;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [offerId, setOfferId] = useState(offers[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

  const account = accounts.find((a) => a.id === accountId);
  const offer = offers.find((o) => o.id === offerId);
  const link =
    account && offer ? buildTrackingLink(offer.trackingUrl, account.metaAccountId) : "";

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable; the link is selectable below
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-xl text-ink">Link Generator</h2>
        <p className="text-ink-3 text-sm">
          Pick your ad account and the offer — paste the result into the
          ad&apos;s <strong className="text-ink-2">Website URL</strong> field.
          Meta fills in the campaign/adset/ad ids per ad automatically.
        </p>
      </div>

      {accounts.length === 0 || offers.length === 0 ? (
        <div className="panel p-10 text-center text-ink-3">
          <p className="font-display tracking-widest text-sm mb-2">
            {accounts.length === 0 ? "NO AD ACCOUNTS ASSIGNED TO YOU" : "NO ACTIVE OFFERS"}
          </p>
          <p className="text-sm">
            {accounts.length === 0
              ? "Ask an admin to assign you an ad account."
              : "Ask an admin to add offers on the Everflow page."}
          </p>
        </div>
      ) : (
        <div className="panel p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">
                Ad Account
              </label>
              <select className="select w-full" value={accountId}
                onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1">
                Offer
              </label>
              <select className="select w-full" value={offerId}
                onChange={(e) => setOfferId(e.target.value)}>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="khala-rule" />

          <div>
            <label className="block text-xs text-ink-3 uppercase tracking-wider mb-2">
              Tracking Link
            </label>
            <div className="bg-surface border border-edge p-3 font-mono text-sm text-psi break-all select-all">
              {link}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn btn-psi" onClick={copy}>
              {copied ? "Copied ✓" : "Copy Link"}
            </button>
            <p className="text-ink-3 text-xs">
              Carries sub1/sub3/sub4 (Meta macros) + source_id (your account id,
              visible to the network for quality scoring) + fbclid (Meta click
              id, lets the network send Conversions API events back to Meta).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
