import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/api";
import { discoverAdAccounts } from "@/lib/meta";

/** List ad accounts the BM's system user token can see, flagging known ones. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminRoute(async () => {
    const { id } = await params;
    const bm = await db.businessManager.findUnique({ where: { id } });
    if (!bm) {
      return NextResponse.json({ error: "BM not found" }, { status: 404 });
    }
    const found = await discoverAdAccounts(bm.systemUserToken);
    const existing = await db.adAccount.findMany({
      select: { metaAccountId: true },
    });
    const known = new Set(existing.map((a) => a.metaAccountId));
    return NextResponse.json({
      accounts: found.map((a) => ({
        metaAccountId: a.account_id,
        name: a.name,
        currency: a.currency,
        timezone: a.timezone_name,
        active: a.account_status === 1,
        alreadyAdded: known.has(a.account_id),
      })),
    });
  });
}
