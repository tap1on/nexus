// UI themes. The choice lives in a cookie (per browser, no login needed) and
// is applied as `data-theme` on <html>, so the server renders the right look
// on first paint with no flash. Styles live in app/globals.css.
export const THEME_COOKIE = "nexus_theme";

export const THEMES = [
  { id: "nexus", label: "Nexus (Protoss)" },
  { id: "clean", label: "Clean (Keitaro-style)" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "nexus";

export function normalizeTheme(value: string | undefined): ThemeId {
  return THEMES.some((t) => t.id === value) ? (value as ThemeId) : DEFAULT_THEME;
}
