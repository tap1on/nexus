import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/api";

const CreateBm = z.object({
  name: z.string().min(1),
  systemUserToken: z.string().min(20),
});

export async function POST(req: Request) {
  return adminRoute(async () => {
    const body = CreateBm.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const bm = await db.businessManager.create({ data: body.data });
    return NextResponse.json({ id: bm.id });
  });
}
