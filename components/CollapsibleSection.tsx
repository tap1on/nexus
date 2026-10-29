"use client";

import { useState } from "react";
import { collapseCookie } from "@/lib/ui-prefs";

export function CollapsibleSection({
  id,
  title,
  defaultOpen,
  summary,
  children,
}: {
  id: string;
  title: string;
  /** server-side read of the cookie, so there is no open→closed flash */
  defaultOpen: boolean;
  /** shown next to the title while collapsed (e.g. compact totals) */
  summary?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  function toggle() {
    const next = !open;
    setOpen(next);
    document.cookie = `${collapseCookie(id)}=${next ? "0" : "1"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-2 min-w-0">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-[0.62rem] text-ink-3 uppercase tracking-[0.2em] hover:text-ink-2 transition-colors shrink-0"
        >
          <span className="inline-block w-3 text-center" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
          {title}
        </button>
        {!open && summary && (
          <div className="text-sm text-ink-2 truncate min-w-0">{summary}</div>
        )}
      </div>
      {open && children}
    </section>
  );
}
