import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { cacheThumbnail, refreshAndCache } from "@/lib/thumbs";

/**
 * Serves an ad's cached thumbnail. Downloads it on first request, and if the
 * stored Meta URL has expired, re-reads the creative and retries once.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ adId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const { adId } = await params;
  if (!/^\d+$/.test(adId)) return new NextResponse(null, { status: 400 });

  // Buyers may only see thumbnails for ads in their own accounts.
  if (user.role === "BUYER") {
    const owned = await db.metaStat.findFirst({
      where: { adId, adAccount: { ownerId: user.id } },
      select: { id: true },
    });
    if (!owned) return new NextResponse(null, { status: 404 });
  }

  let file: string | null = null;
  try {
    file = (await cacheThumbnail(adId)) ?? (await refreshAndCache(adId));
  } catch (e) {
    console.warn(`[thumb] ${adId}:`, e instanceof Error ? e.message : e);
  }
  if (!file) return new NextResponse(null, { status: 404 });

  const bytes = await fs.readFile(file);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      // creatives don't change for an ad id; cache aggressively
      "Cache-Control": "private, max-age=604800, immutable",
    },
  });
}
