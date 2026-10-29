"use client";

import { useRouter } from "next/navigation";
import { THEMES, THEME_COOKIE, ThemeId } from "@/lib/theme";

export function ThemeToggle({ theme }: { theme: ThemeId }) {
  const router = useRouter();

  function change(next: string) {
    // Apply instantly, persist for a year, then let the server re-render so
    // the cookie-driven <html data-theme> matches on the next navigation.
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <label className="block">
      <span className="block text-[0.6rem] text-ink-3 uppercase tracking-wider mb-1">
        Theme
      </span>
      <select
        className="select w-full text-sm py-1"
        value={theme}
        onChange={(e) => change(e.target.value)}
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </label>
  );
}
