/**
 * Re-stores pages that page-purge.ts just dropped, so the first visitor after
 * a publish or an admin edit gets a stored copy instead of waiting for a full
 * render (1–3 s on a cold app isolate; Semrush's nightly crawl is often that
 * first visitor for a new post and flags it as slow).
 *
 * The app Worker renders the pages itself, in-process, through the renderer
 * cloudflare/worker.ts registers for each request. It cannot simply fetch
 * them through the public hostname: that belongs to the front Worker on the
 * same zone, which Cloudflare does not let one Worker call from another by
 * URL. The two bundles (OpenNext's and wrangler's) hold separate copies of
 * this module, so the renderer is handed over through a global.
 *
 * Only a bounded number of pages is warmed, shortest paths first, so a root
 * layout revalidation (firm settings: ~930 pages) warms the home page and the
 * hubs and leaves the long tail to refresh on its next visit as before.
 */
import { isShareable, toStored } from "./page-cache";
import { BUILD_HEADER, encodeStored, PREFIX } from "./page-store";

export type PageRenderer = (request: Request) => Promise<Response>;

/** Most pages warmed per purge; the rest keep the old refresh-on-visit behaviour. */
export const WARM_LIMIT = 24;
const CONCURRENCY = 4;
const RENDERER = Symbol.for("mmg-law.renderPage");

/** Register the in-process renderer for the current isolate (cloudflare/worker.ts). */
export function setPageRenderer(render: PageRenderer | undefined): void {
  (globalThis as Record<symbol, unknown>)[RENDERER] = render;
}

export function getPageRenderer(): PageRenderer | undefined {
  return (globalThis as Record<symbol, unknown>)[RENDERER] as PageRenderer | undefined;
}

/** The public URL a stored-page key was rendered from (the deploy marker is the store's, not the page's). */
export function pageUrl(key: string, buildId: string): URL {
  const url = new URL(`https://${key.slice(`${PREFIX}${buildId}/`.length)}`);
  url.searchParams.delete("__deploy");
  return url;
}

const depth = (key: string) => key.split("?")[0].split("/").length;

/** Which of the dropped pages to warm: the shallowest first, up to WARM_LIMIT. */
export function pagesToWarm(keys: string[], limit = WARM_LIMIT): string[] {
  return [...keys].sort((a, b) => depth(a) - depth(b) || a.localeCompare(b)).slice(0, limit);
}

/** Render and store each key; returns how many were stored. Never throws for one page's failure. */
export async function warmStoredPages({
  keys,
  render,
  bucket,
  buildId,
  now = Date.now,
}: {
  keys: string[];
  render: PageRenderer;
  bucket: { put(key: string, value: ArrayBuffer): Promise<unknown> };
  buildId: string;
  now?: () => number;
}): Promise<number> {
  const queue = pagesToWarm(keys);
  let stored = 0;
  const worker = async () => {
    for (let key = queue.shift(); key !== undefined; key = queue.shift()) {
      try {
        const res = await render(
          new Request(pageUrl(key, buildId), { headers: { accept: "text/html", "user-agent": "mmg-rewarm" } }),
        );
        if (!isShareable(res)) continue;
        const page = toStored(res, now());
        page.headers.set(BUILD_HEADER, buildId);
        await bucket.put(key, await encodeStored(page));
        stored++;
      } catch (err) {
        console.error("[page-warm] failed", key, err);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  return stored;
}
