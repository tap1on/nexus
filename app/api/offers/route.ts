import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/api";
import { fetchOfferTrackingUrl } from "@/lib/everflow";

const CreateOffer = z.object({
  instanceId: z.string().min(1),
  name: z.string().min(1),
  networkOfferId: z.string().regex(/^\d+$/).optional(),
  trackingUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  return adminRoute(async () => {
    const body = CreateOffer.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { instanceId, name, networkOfferId } = body.data;
    let trackingUrl = body.data.trackingUrl ?? "";

    const instance = await db.everflowInstance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }
    if (networkOfferId) {
      const dupe = await db.offer.findFirst({
        where: { instanceId, networkOfferId },
      });
      if (dupe) {
        return NextResponse.json({ error: "Offer already added" }, { status: 409 });
      }
    }
    // API-sourced offers: get the canonical link if none was supplied.
    if (!trackingUrl && networkOfferId) {
      try {
        trackingUrl = await fetchOfferTrackingUrl(instance.apiKey, networkOfferId);
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Tracking URL fetch failed" },
          { status: 400 }
        );
      }
    }
    if (!trackingUrl) {
      return NextResponse.json(
        { error: "A tracking URL is required for manual offers" },
        { status: 400 }
      );
    }
    const offer = await db.offer.create({
      data: {
        instanceId,
        name,
        networkOfferId: networkOfferId ?? null,
        trackingUrl,
      },
    });
    return NextResponse.json({ id: offer.id });
  });
}
