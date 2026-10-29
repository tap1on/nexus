import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/api";

const CreateAccount = z.object({
  bmId: z.string().min(1),
  metaAccountId: z.string().regex(/^\d+$/, "Numeric account id (without act_)"),
  name: z.string().min(1),
  currency: z.string().default("USD"),
  timezone: z.string().optional(),
  ownerId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  return adminRoute(async () => {
    const body = CreateAccount.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const existing = await db.adAccount.findUnique({
      where: { metaAccountId: body.data.metaAccountId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ad account already added" },
        { status: 409 }
      );
    }
    const acc = await db.adAccount.create({
      data: { ...body.data, ownerId: body.data.ownerId || null },
    });
    return NextResponse.json({ id: acc.id });
  });
}
