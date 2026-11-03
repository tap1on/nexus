import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/api";
import { fetchOfferUrls } from "@/lib/everflow";

/** Extra destination URLs (landing pages) of one Everflow offer, live. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  return adminRoute(async () => {
    const { id, offerId } = await params;
    if (!/^\d+$/.test(offerId)) {
      return NextResponse.json({ error: "Invalid offer id" }, { status: 400 });
    }
    const instance = await db.everflowInstance.findUnique({ where: { id } });
    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }
    const urls = await fetchOfferUrls(instance.apiKey, offerId);
    return NextResponse.json({ urls });
  });
}
