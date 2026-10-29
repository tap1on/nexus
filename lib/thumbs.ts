// Ad thumbnail cache. Meta's thumbnail URLs are signed CDN links that expire,
// so the bytes are downloaded once into the data volume and served from
// /api/thumb/<adId>. If a cached file is missing and the stored URL has
// expired, the creative is re-read from Meta and the download retried.
import { promises as fs } from "fs";
import path from "path";
import { db } from "./db";
import { fetchAdCreatives, postUrlFromStoryId, MetaAdCreative } from "./meta";

export const THUMB_DIR =
  process.env.THUMB_CACHE_DIR || path.join(process.cwd(), "prisma", "data", "thumbs");

export function thumbPath(adId: string): string {
  // adIds are numeric; the guard keeps path traversal impossible anyway
  if (!/^\d+$/.test(adId)) throw new Error("bad ad id");
  return path.join(THUMB_DIR, `${adId}.jpg`);
}

/** Upsert creative rows from Meta and derive the post URL. */
export async function storeCreatives(creatives: MetaAdCreative[]): Promise<void> {
  for (const c of creatives) {
    const data = {
      creativeId: c.creativeId,
      thumbnailUrl: c.thumbnailUrl,
      imageUrl: c.imageUrl,
      videoId: c.videoId,
      storyId: c.storyId,
      instagramMediaId: c.instagramMediaId,
      postUrl: postUrlFromStoryId(c.storyId),
      fetchedAt: new Date(),
    };
    await db.adCreative.upsert({
      where: { adId: c.adId },
      create: { adId: c.adId, ...data },
      update: data,
    });
  }
}

/**
 * Download the thumbnail for one ad into the cache. Returns the file path,
 * or null when there is nothing to download / the download failed.
 */
export async function cacheThumbnail(adId: string): Promise<string | null> {
  const file = thumbPath(adId);
  try {
    await fs.access(file);
    return file;
  } catch {
    /* not cached yet */
  }
  const row = await db.adCreative.findUnique({ where: { adId } });
  if (!row) return null;
  const url = row.thumbnailUrl || row.imageUrl;
  if (!url) return null;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0) return null;
  await fs.mkdir(THUMB_DIR, { recursive: true });
  await fs.writeFile(file, bytes);
  await db.adCreative.update({ where: { adId }, data: { cachedAt: new Date() } });
  return file;
}

/**
 * Sync step: fetch creatives for ads we have no row for (or whose thumbnail
 * download failed more than a day ago) and cache their thumbnails.
 * Returns how many creatives were fetched.
 */
export async function syncCreatives(token: string, adIds: string[]): Promise<number> {
  if (adIds.length === 0) return 0;
  const existing = await db.adCreative.findMany({
    where: { adId: { in: adIds } },
    select: { adId: true, cachedAt: true, fetchedAt: true },
  });
  const known = new Map(existing.map((e) => [e.adId, e]));
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const todo = adIds.filter((id) => {
    const e = known.get(id);
    return !e || (!e.cachedAt && e.fetchedAt.getTime() < dayAgo);
  });
  if (todo.length === 0) return 0;
  const creatives = await fetchAdCreatives(token, todo);
  await storeCreatives(creatives);
  for (const c of creatives) {
    try {
      await cacheThumbnail(c.adId);
    } catch (e) {
      console.warn(`[thumbs] cache failed for ad ${c.adId}:`, e);
    }
  }
  return creatives.length;
}

/** Re-read one ad's creative from Meta (fresh signed URLs), then cache. */
export async function refreshAndCache(adId: string): Promise<string | null> {
  const stat = await db.metaStat.findFirst({
    where: { adId },
    select: { adAccount: { select: { bm: { select: { systemUserToken: true } } } } },
  });
  if (!stat) return null;
  const creatives = await fetchAdCreatives(stat.adAccount.bm.systemUserToken, [adId]);
  if (creatives.length === 0) return null;
  await storeCreatives(creatives);
  return cacheThumbnail(adId);
}
