import { NextResponse } from "next/server";
import { verifyLogin, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const user = await verifyLogin(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  await createSession(user);
  return NextResponse.json({ ok: true });
}
