import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { adminRoute } from "@/lib/api";

const CreateUser = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "BUYER"]),
});

export async function POST(req: Request) {
  return adminRoute(async () => {
    const body = CreateUser.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { email, name, password, role } = body.data;
    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash: hashPassword(password),
        role,
      },
    });
    return NextResponse.json({ id: user.id });
  });
}
