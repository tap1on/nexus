// All reporting runs on Europe/Berlin dates (Meta accounts, Everflow instances
// and the business itself are aligned to Berlin time).
export const REPORTING_TZ = "Europe/Berlin";

/** Current date string YYYY-MM-DD in Berlin time. */
export function todayBerlin(): string {
  return dateInBerlin(new Date());
}

export function dateInBerlin(d: Date): string {
  // en-CA locale formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORTING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** date string shifted by n days (n may be negative). Operates on plain dates. */
export function shiftDate(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Inclusive list of YYYY-MM-DD strings from `from` to `to`. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = shiftDate(cur, 1);
  }
  return out;
}
