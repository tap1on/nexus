import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { userRoute } from "@/lib/api";
import { setEntityStatus, MetaApiError } from "@/lib/meta";

const Body = z.object({
  entityId: z.string().min(1),
  action: z.enum(["pause", "resume"]),
});

export async function POST(req: Request) {
  return userRoute(async (user) => {
    const body = Body.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { entityId, action } = body.data;

    const entity = await db.metaEntity.findUnique({ where: { entityId } });
    if (!entity) {
      return NextResponse.json({ error: "Unknown entity" }, { status: 404 });
    }
    const account = await db.adAccount.findUnique({
      where: { id: entity.adAccountId },
      include: { bm: true },
    });
    if (!account) {
      return NextResponse.json({ error: "Unknown ad account" }, { status: 404 });
    }
    // Buyers may only control entities in ad accounts assigned to them.
    if (user.role !== "ADMIN" && account.ownerId !== user.id) {
      return NextResponse.json(
        { error: "This ad account is not assigned to you" },
        { status: 403 }
      );
    }
    if (["DELETED", "ARCHIVED"].includes(entity.effectiveStatus)) {
      return NextResponse.json(
        { error: "Entity is deleted on Meta" },
        { status: 409 }
      );
    }

    try {
      const fresh = await setEntityStatus(
        account.bm.systemUserToken,
        entityId,
        action === "pause" ? "PAUSED" : "ACTIVE"
      );
      await db.metaEntity.update({
        where: { entityId },
        data: { status: fresh.status, effectiveStatus: fresh.effectiveStatus },
      });
      return NextResponse.json(fresh);
    } catch (e) {
      if (e instanceof MetaApiError) {
        // Code 10 / OAuth 200-range subcodes = missing ads_management.
        return NextResponse.json(
          { error: `Meta rejected the change: ${e.message}` },
          { status: 502 }
        );
      }
      throw e;
    }
  });
}
