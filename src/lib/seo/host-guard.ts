/**
 * Hosts other than the production one (staging.mmg-lawfirm.com, the
 * workers.dev URL, Vercel preview URLs) must never be indexed, or they
 * compete with production in search. The proxy adds `X-Robots-Tag:
 * noindex, nofollow` whenever this returns true, comparing against
 * SITE.productionUrl — not NEXT_PUBLIC_SITE_URL, which staging sets to its
 * own host. Local development hosts are exempt.
 */
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|[^.]+\.localhost|[^.]+\.test)(:\d+)?$/i;

/**
 * The bare domain must 308 to www (Vercel does this at the platform level;
 * on Cloudflare the app does it). Returns the redirect target or null.
 */
export function apexRedirect(
  requestHost: string | null | undefined,
  requestUrl: string,
  productionUrl: string,
): string | null {
  let prod: URL;
  try {
    prod = new URL(productionUrl);
  } catch {
    return null;
  }
  const apex = prod.host.replace(/^www\./i, "").toLowerCase();
  if (apex === prod.host.toLowerCase()) return null; // production is not www
  if ((requestHost ?? "").trim().toLowerCase() !== apex) return null;
  const u = new URL(requestUrl);
  return `${prod.origin}${u.pathname}${u.search}`;
}

export function isNonCanonicalHost(
  requestHost: string | null | undefined,
  siteUrl: string,
): boolean {
  const host = (requestHost ?? "").trim().toLowerCase();
  if (!host) return false;
  if (LOCAL.test(host)) return false;
  let canonical = "";
  try {
    canonical = new URL(siteUrl).host.toLowerCase();
  } catch {
    return false;
  }
  if (!canonical || LOCAL.test(canonical)) return false;
  return host !== canonical;
}
