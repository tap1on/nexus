import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth";
import { syncAll } from "@/lib/sync";

let syncing = false;

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 500;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
  if (syncing) {
    return NextResponse.json({ error: "Sync already running" }, { status: 409 });
  }
  const body = (await req.json().catch(() => ({}))) as { lookback?: number };
  const fallback = parseInt(process.env.FAST_LOOKBACK_DAYS || "7", 10);
  const lookback = Math.min(
    90,
    Math.max(1, Math.trunc(Number(body.lookback) || fallback))
  );
  syncing = true;
  // Fire and forget — progress is visible on the Sync Status page.
  syncAll(lookback)
    .catch((e) => console.error("[manual sync] failed:", e))
    .finally(() => {
      syncing = false;
    });
  return NextResponse.json({ ok: true, lookback }, { status: 202 });
}
