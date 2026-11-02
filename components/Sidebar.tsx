"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Nav } from "./Nav";
import { ThemeId } from "@/lib/theme";

/**
 * Desktop: fixed left column. Mobile (< md): a top bar with a hamburger that
 * expands the nav below it, pushing the page content down.
 */
export function Sidebar({
  isAdmin,
  userName,
  theme,
}: {
  isAdmin: boolean;
  userName: string;
  theme: ThemeId;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <aside className="md:w-56 md:shrink-0 border-b md:border-b-0 md:border-r border-edge bg-surface/60 flex flex-col">
      <div className="flex items-center justify-between p-4 md:block md:p-5">
        <div>
          <h1 className="text-lg text-gold">NEXUS</h1>
          <div className="khala-rule mt-2 hidden md:block" />
          <p className="hidden md:block text-[0.65rem] text-ink-3 uppercase tracking-[0.2em] mt-2">
            Media Buying Tracker
          </p>
        </div>
        <button
          className="btn px-3 py-2 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>
      <div className={`${open ? "flex" : "hidden"} md:flex flex-col flex-1`}>
        <Nav isAdmin={isAdmin} userName={userName} theme={theme} />
      </div>
    </aside>
  );
}
