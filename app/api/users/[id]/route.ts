import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { adminRoute } from "@/lib/api";

const PatchUser = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "BUYER"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return adminRoute(async () => {
    const { id } = await params;
    const body = PatchUser.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { password, ...rest } = body.data;
    await db.user.update({
      where: { id },
      data: { ...rest, ...(password ? { passwordHash: hashPassword(password) } : {}) },
    });
    return NextResponse.json({ ok: true });
  });
}
