/**
 * The tracking-link contract: Meta URL macros in sub1/sub3/sub4 (matching),
 * plus the ad account id as source_id (network-side quality dimension and
 * Nexus-side fallback attribution).
 */
export function buildTrackingLink(
  baseUrl: string,
  metaAccountId: string
): string {
  const sep = baseUrl.includes("?") ? "&" : "?";
  return (
    `${baseUrl}${sep}` +
    `sub1={{campaign.id}}&sub3={{adset.id}}&sub4={{ad.id}}` +
    `&source_id=${metaAccountId}`
  );
}
