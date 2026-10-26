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

/**
 * Plain-http requests must 308 to https (Vercel did this at the platform
 * level; Cloudflare only does it with "Always Use HTTPS" on). The visitor's
 * scheme comes only from what the edge reports — `x-forwarded-proto`, else
 * Cloudflare's `cf-visitor` — never the request URL: `wrangler dev` serves
 * the production host over plain http with neither header, and redirecting
 * there loops. Local hosts are left alone. Returns the target or null.
 */
export function httpsRedirect(
  requestHost: string | null | undefined,
  forwardedProto: string | null | undefined,
  requestUrl: string,
  cfVisitor?: string | null,
): string | null {
  const host = (requestHost ?? "").trim().toLowerCase();
  if (!host || LOCAL.test(host)) return null;
  let proto = (forwardedProto ?? "").split(",")[0].trim().toLowerCase();
  if (!proto && cfVisitor) {
    try {
      proto = String((JSON.parse(cfVisitor) as { scheme?: string }).scheme ?? "").toLowerCase();
    } catch {
      proto = "";
    }
  }
  if (proto !== "http") return null;
  const u = new URL(requestUrl);
  return `https://${host}${u.pathname}${u.search}`;
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
