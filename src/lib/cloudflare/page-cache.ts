/**
 * Edge cache for public HTML documents on the Cloudflare Worker.
 *
 * Worker responses never enter Cloudflare's CDN cache, so every page view ran
 * the proxy (Supabase redirect lookup + session check), read the page from R2
 * and checked the Durable Object tag cache: 0.7–1.4 s to first byte against
 * 0.2–0.45 s for the same build on Vercel's CDN. The Cache API stores the
 * finished document per data center instead.
 *
 * Freshness: a stored page is served as-is for FRESH_SECONDS, then served
 * stale (for up to STORE_SECONDS) while one background request re-renders it.
 * Admin edits purge Next's cache but not this one, so they reach visitors
 * within about a minute (one request per data center after the edit).
 *
 * Only what Next itself marks shareable is stored: a 200 with `s-maxage`, no
 * `private`/`no-store`, no Set-Cookie. Dynamic routes (/login, /admin, search)
 * send `private, no-store` and pass straight through.
 */
// Relative, not "@/": cloudflare/worker.ts is bundled by wrangler, not Next.
import { isPrivateAnalyticsPath } from "../analytics/private-routes";

export const FRESH_SECONDS = 60;
export const STORE_SECONDS = 86_400;

const STORED_AT = "x-edge-stored-at";
const ORIGINAL_CC = "x-edge-cache-control";

/** Marketing query parameters that never change the rendered page. */
const TRACKING_PARAMS = /^(utm_[a-z]+|gclid|gbraid|wbraid|fbclid|msclkid|ttclid|li_fat_id|mc_[a-z]+|_ga|_gl)$/i;

/**
 * A top-level public page load: not an RSC/prefetch fetch (those vary on
 * router headers the Cache API ignores), not a private route, and not a
 * signed-in admin (whose session cookie the proxy refreshes).
 */
export function isCacheableDocumentRequest(request: Request): boolean {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) return false;
  if (isPrivateAnalyticsPath(url.pathname)) return false;
  if (url.searchParams.has("_rsc")) return false;
  const h = request.headers;
  if (h.has("rsc") || h.has("next-router-prefetch") || h.has("next-router-state-tree")) return false;
  const dest = h.get("sec-fetch-dest");
  if (dest ? dest !== "document" : !h.get("accept")?.includes("text/html")) return false;
  if (/(?:^|;\s*)sb-[^=]*=/.test(h.get("cookie") ?? "")) return false;
  return true;
}

/** Cache key: the URL without tracking parameters, so ad clicks share a copy. */
export function pageCacheKey(request: Request): string {
  const url = new URL(request.url);
  for (const name of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(name)) url.searchParams.delete(name);
  }
  url.searchParams.sort();
  url.hash = "";
  return url.toString();
}

/** Whether Next marked this response as shareable between visitors. */
export function isShareable(res: Response): boolean {
  if (res.status !== 200 || res.headers.has("set-cookie")) return false;
  const cc = res.headers.get("cache-control")?.toLowerCase() ?? "";
  if (/\b(private|no-store|no-cache)\b/.test(cc)) return false;
  return /\bs-maxage=\d+/.test(cc);
}

function toStored(res: Response, now: number): Response {
  const stored = new Response(res.body, res);
  stored.headers.set(ORIGINAL_CC, res.headers.get("cache-control") ?? "");
  stored.headers.set(STORED_AT, String(now));
  stored.headers.set("cache-control", `public, max-age=${STORE_SECONDS}`);
  return stored;
}

function fromStored(res: Response, status: "HIT" | "STALE"): Response {
  const out = new Response(res.body, res);
  out.headers.set("cache-control", res.headers.get(ORIGINAL_CC) ?? "");
  out.headers.delete(ORIGINAL_CC);
  out.headers.delete(STORED_AT);
  out.headers.set("x-edge-cache", status);
  return out;
}

/**
 * Serve a public document from `cache` when present (refreshing it in the
 * background once older than FRESH_SECONDS); otherwise render it with
 * `render` and store it if Next marked it shareable.
 */
export async function cachedPage(
  request: Request,
  cache: Cache,
  render: (request: Request) => Promise<Response>,
  waitUntil: (p: Promise<unknown>) => void,
  now: () => number = Date.now,
): Promise<Response> {
  const key = pageCacheKey(request);
  const store = async (res: Response) => {
    if (isShareable(res)) await cache.put(key, toStored(res, now()));
  };

  const hit = await cache.match(key);
  if (hit) {
    const age = (now() - Number(hit.headers.get(STORED_AT) ?? 0)) / 1000;
    if (age <= FRESH_SECONDS) return fromStored(hit, "HIT");
    // A Request whose body was never read can be reused for the refresh.
    waitUntil(render(request.clone()).then(store).catch(() => {}));
    return fromStored(hit, "STALE");
  }

  const res = await render(request);
  if (!isShareable(res)) return res;
  const out = new Response(res.body, res);
  out.headers.set("x-edge-cache", "MISS");
  waitUntil(store(out.clone()).catch(() => {}));
  return out;
}
