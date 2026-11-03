import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/api";

const PatchOffer = z.object({
  name: z.string().min(1).optional(),
  trackingUrl: z.string().url().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  // Everflow offer id, settable on manual offers so step events can be mapped
  networkOfferId: z.string().regex(/^\d+$/).optional(),
  // Everflow event names for the Step 1 / Step 2 columns; "" clears a mapping
  step1Event: z.string().max(200).optional(),
  step2Event: z.string().max(200).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminRoute(async () => {
    const { id } = await params;
    const body = PatchOffer.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const offer = await db.offer.findUnique({ where: { id } });
    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }
    const { step1Event, step2Event, networkOfferId, ...rest } = body.data;
    // When an offer joins an EF offer group, inherit the group's step mapping.
    let inherit: { step1Event: string; step2Event: string } | undefined;
    if (networkOfferId && networkOfferId !== offer.networkOfferId) {
      const dupe = await db.offer.findFirst({
        where: {
          instanceId: offer.instanceId,
          networkOfferId,
          networkUrlId: offer.networkUrlId,
          NOT: { id },
        },
      });
      if (dupe) {
        return NextResponse.json(
          { error: `"${dupe.name}" already uses Everflow offer id ${networkOfferId}` },
          { status: 409 }
        );
      }
      const sibling = await db.offer.findFirst({
        where: { instanceId: offer.instanceId, networkOfferId, NOT: { id } },
      });
      if (sibling) {
        inherit = { step1Event: sibling.step1Event, step2Event: sibling.step2Event };
      }
    }
    await db.offer.update({
      where: { id },
      data: {
        ...rest,
        ...(networkOfferId ? { networkOfferId } : {}),
        ...(inherit ?? {}),
      },
    });

    // Step mappings describe the EF offer, not one landing page row — keep
    // every row of the same (instance, EF offer) in agreement.
    const steps = {
      ...(step1Event !== undefined ? { step1Event } : {}),
      ...(step2Event !== undefined ? { step2Event } : {}),
    };
    if (Object.keys(steps).length > 0) {
      const efId = networkOfferId ?? offer.networkOfferId;
      if (efId) {
        await db.offer.updateMany({
          where: { instanceId: offer.instanceId, networkOfferId: efId },
          data: steps,
        });
      } else {
        await db.offer.update({ where: { id }, data: steps });
      }
    }
    return NextResponse.json({ ok: true });
  });
}
