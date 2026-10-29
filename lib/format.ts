export function fmtMoney(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("en-US");
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(digits)}%`;
}

/** profit/roi with explicit sign so status color is never the only cue */
export function fmtSigned(v: number, fmt: (n: number) => string): string {
  return v > 0 ? `+${fmt(v)}` : fmt(v);
}
