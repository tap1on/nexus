import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/api";

const PatchAccount = z.object({
  name: z.string().min(1).optional(),
  ownerId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "RETIRED"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminRoute(async () => {
    const { id } = await params;
    const body = PatchAccount.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { ownerId, ...rest } = body.data;
    await db.adAccount.update({
      where: { id },
      data: {
        ...rest,
        ...(ownerId !== undefined ? { ownerId: ownerId || null } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  });
}
