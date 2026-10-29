import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/api";

const PatchInstance = z.object({
  name: z.string().min(1).optional(),
  apiKey: z.string().min(10).optional(),
  timezoneId: z.number().int().optional(),
  status: z.enum(["ACTIVE", "RETIRED"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminRoute(async () => {
    const { id } = await params;
    const body = PatchInstance.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    await db.everflowInstance.update({ where: { id }, data: body.data });
    return NextResponse.json({ ok: true });
  });
}
