import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth";
import { syncAll } from "@/lib/sync";

let syncing = false;

export async function POST() {
  try {
    await requireAdmin();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 500;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
  if (syncing) {
    return NextResponse.json({ error: "Sync already running" }, { status: 409 });
  }
  syncing = true;
  // Fire and forget — progress is visible on the Sync Status page.
  syncAll(parseInt(process.env.FAST_LOOKBACK_DAYS || "7", 10))
    .catch((e) => console.error("[manual sync] failed:", e))
    .finally(() => {
      syncing = false;
    });
  return NextResponse.json({ ok: true }, { status: 202 });
}
