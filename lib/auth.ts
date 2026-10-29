import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";

const COOKIE_NAME = "nexus_session";
const SESSION_DAYS = 14;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "BUYER";
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ u: user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 3600,
    path: "/",
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  // cookies() stays outside the try/catch: Next uses a thrown signal to mark
  // the route dynamic during prerendering, and we must not swallow it.
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const u = payload.u as SessionUser | undefined;
    if (!u?.id) return null;
    // Re-check against DB so deactivated users / role changes take effect immediately.
    const fresh = await db.user.findUnique({ where: { id: u.id } });
    if (!fresh || !fresh.active) return null;
    return {
      id: fresh.id,
      email: fresh.email,
      name: fresh.name,
      role: fresh.role as "ADMIN" | "BUYER",
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new AuthError(401, "Not authenticated");
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "ADMIN") throw new AuthError(403, "Admin access required");
  return u;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function verifyLogin(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user || !user.active) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "ADMIN" | "BUYER",
  };
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 11);
}
