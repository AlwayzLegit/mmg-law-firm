/**
 * Edge cache for /_next/image on the Cloudflare Worker.
 *
 * Worker responses never enter Cloudflare's CDN cache on their own, so
 * without this every image request went to the Images binding and was
 * resized again: 0.8–2.8 s for a hero on production, which was most of the
 * mobile LCP on the practice and city pages. The Cache API stores the result
 * per data center.
 *
 * Kept out of cloudflare/worker.ts (which imports generated output) so it
 * can be unit-tested.
 */

/**
 * OpenNext marks /_next/image responses immutable only for images imported
 * in code; every /public image (all of ours) comes back with no
 * Cache-Control, so browsers re-download them on each visit. Give those a
 * day fresh plus a week of stale-while-revalidate.
 */
export const IMAGE_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";

/** The encoding the optimizer picks from Accept (AVIF, then WebP, else the original). */
export function imageFormat(accept: string | null): "avif" | "webp" | "orig" {
  if (accept?.includes("image/avif")) return "avif";
  if (accept?.includes("image/webp")) return "webp";
  return "orig";
}

/**
 * Cache key: the image URL plus the negotiated format. The Cache API ignores
 * `Vary: Accept`, so without the format a browser without AVIF support
 * could be served the AVIF bytes.
 */
export function imageCacheKey(request: Request): string {
  const url = new URL(request.url);
  url.searchParams.set("__fmt", imageFormat(request.headers.get("accept")));
  return url.toString();
}

export function isImageRequest(request: Request): boolean {
  return request.method === "GET" && new URL(request.url).pathname === "/_next/image";
}

/**
 * Serve /_next/image from `cache` when present; otherwise render it with
 * `render`, give it a Cache-Control if it has none, and store successful
 * responses in the background.
 */
export async function cachedImage(
  request: Request,
  cache: Cache,
  render: (request: Request) => Promise<Response>,
  waitUntil: (p: Promise<unknown>) => void,
): Promise<Response> {
  const key = imageCacheKey(request);
  const hit = await cache.match(key);
  if (hit) return hit;

  const res = await render(request);
  if (res.status !== 200) return res;
  const out = new Response(res.body, res);
  if (!out.headers.has("cache-control")) out.headers.set("cache-control", IMAGE_CACHE_CONTROL);
  waitUntil(cache.put(key, out.clone()).catch(() => {}));
  return out;
}
