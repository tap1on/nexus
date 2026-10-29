import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "./auth";

/** Run an admin-only route handler with uniform auth/error handling. */
export async function adminRoute(
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    await requireAdmin();
    return await fn();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[api]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
