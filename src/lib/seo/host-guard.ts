/**
 * Hosts other than the production one (staging.mmg-lawfirm.com, the
 * workers.dev URL, Vercel preview URLs) must never be indexed, or they
 * compete with production in search. The proxy adds `X-Robots-Tag:
 * noindex, nofollow` whenever this returns true, comparing against
 * SITE.productionUrl — not NEXT_PUBLIC_SITE_URL, which staging sets to its
 * own host. Local development hosts are exempt.
 */
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|[^.]+\.localhost|[^.]+\.test)(:\d+)?$/i;

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
