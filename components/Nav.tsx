"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { ThemeId } from "@/lib/theme";

const MAIN = [
  { href: "/", label: "Dashboard", icon: "◈" },
  { href: "/links", label: "Link Generator", icon: "⌁" },
  { href: "/sync", label: "Sync Status", icon: "⟳" },
];

const ADMIN = [
  { href: "/unmatched", label: "Unmatched Revenue", icon: "⚠" },
  { href: "/admin/accounts", label: "Ad Accounts", icon: "▣" },
  { href: "/admin/bms", label: "Business Managers", icon: "◆" },
  { href: "/admin/everflow", label: "Everflow", icon: "⬡" },
  { href: "/admin/users", label: "Users", icon: "✦" },
];

export function Nav({
  isAdmin,
  userName,
  theme,
}: {
  isAdmin: boolean;
  userName: string;
  theme: ThemeId;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const link = (item: { href: string; label: string; icon: string }) => (
    <Link
      key={item.href}
      href={item.href}
      className={`nav-link ${pathname === item.href ? "active" : ""}`}
    >
      <span className="text-xs w-4 text-center">{item.icon}</span>
      {item.label}
    </Link>
  );

  return (
    <div className="flex flex-col flex-1">
      <nav className="flex-1">
        {MAIN.map(link)}
        {isAdmin && (
          <>
            <p className="text-[0.6rem] text-ink-3 uppercase tracking-[0.25em] px-4 mt-6 mb-1">
              Command
            </p>
            {ADMIN.map(link)}
          </>
        )}
      </nav>
      <div className="p-4 border-t border-edge space-y-3">
        <ThemeToggle theme={theme} />
        <p className="text-sm text-ink-2 truncate">{userName}</p>
        <button onClick={logout} className="btn w-full text-[0.6rem]">
          Recall
        </button>
      </div>
    </div>
  );
}
