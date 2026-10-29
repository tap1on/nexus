import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/api";
import { fetchRunnableOffers } from "@/lib/everflow";

/** Runnable offers from the Everflow API, flagged with what's already added. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminRoute(async () => {
    const { id } = await params;
    const instance = await db.everflowInstance.findUnique({ where: { id } });
    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }
    const [offers, existing] = await Promise.all([
      fetchRunnableOffers(instance.apiKey),
      db.offer.findMany({
        where: { instanceId: id, networkOfferId: { not: null } },
        select: { networkOfferId: true },
      }),
    ]);
    const known = new Set(existing.map((o) => o.networkOfferId));
    return NextResponse.json({
      offers: offers.map((o) => ({
        ...o,
        alreadyAdded: known.has(o.networkOfferId),
      })),
    });
  });
}
