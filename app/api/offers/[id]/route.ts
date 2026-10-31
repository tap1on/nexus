import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/api";

const PatchOffer = z.object({
  name: z.string().min(1).optional(),
  trackingUrl: z.string().url().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
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
    await db.offer.update({ where: { id }, data: body.data });
    return NextResponse.json({ ok: true });
  });
}
