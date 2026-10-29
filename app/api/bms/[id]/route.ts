import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/api";

const PatchBm = z.object({
  name: z.string().min(1).optional(),
  systemUserToken: z.string().min(20).optional(),
  status: z.enum(["ACTIVE", "RETIRED"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminRoute(async () => {
    const { id } = await params;
    const body = PatchBm.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    await db.businessManager.update({ where: { id }, data: body.data });
    // Retiring a BM retires its accounts too (history is kept).
    if (body.data.status === "RETIRED") {
      await db.adAccount.updateMany({
        where: { bmId: id },
        data: { status: "RETIRED" },
      });
    }
    return NextResponse.json({ ok: true });
  });
}
