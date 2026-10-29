// Small per-browser UI preferences stored in cookies, so the server can
// render the right state on first paint (same approach as lib/theme.ts).

/** Cookie holding "1" when the section with this id is collapsed. */
export function collapseCookie(id: string): string {
  return `nexus_collapse_${id}`;
}
