/**
 * The tracking-link contract: Meta URL macros in sub1/sub3/sub4 (matching),
 * plus the ad account id as source_id (network-side quality dimension and
 * Nexus-side fallback attribution), plus the Meta click id as fbclid so the
 * network can fire Conversions API events back to Meta. Everflow's partner
 * guide specifies the single-brace `{fbclid}` form for redirect links.
 */
export function buildTrackingLink(
  baseUrl: string,
  metaAccountId: string
): string {
  const sep = baseUrl.includes("?") ? "&" : "?";
  return (
    `${baseUrl}${sep}` +
    `sub1={{campaign.id}}&sub3={{adset.id}}&sub4={{ad.id}}` +
    `&source_id=${metaAccountId}` +
    `&fbclid={fbclid}`
  );
}
