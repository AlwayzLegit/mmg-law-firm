/**
 * Page store for the front Worker (cloudflare/front.ts): the data center's
 * Cache API first, then one copy per page in R2 that every data center reads.
 *
 * Why: the app Worker's bundle is ~27 MB, and a fresh isolate takes 1–3 s to
 * load it before it answers anything, even a cache hit. The Cache API is per
 * data center, so a crawler that loads each page once (Semrush's audit) met a
 * fresh isolate or an empty cache on most pages. The front Worker is small
 * enough to start instantly, and R2 is shared, so a page rendered once (or
 * pre-loaded after a deploy) is fast everywhere.
 *
 * Only pages rendered by the build the front Worker was deployed for are
 * stored (the app marks each response with `x-build-id`): a page from another
 * build points at /_next/static chunks this deploy does not have.
 *
 * R2 is the source of truth: the data center's copy is trusted only while it
 * is younger than FRESH_SECONDS. After that R2 decides, so a page dropped by
 * page-purge.ts (a publish or an admin edit) re-renders instead of serving the
 * copy this data center happens to hold.
 */
import { FRESH_SECONDS, type PageStore } from "./page-cache";

export const BUILD_HEADER = "x-build-id";

/** A stored page older than this is a miss, not served stale. */
export const R2_MAX_SECONDS = 7 * 86_400;

const STORED_AT = "x-edge-stored-at";
export const PREFIX = "edge-pages/";

/** The slice of an R2 bucket binding this store uses. */
export type PageBucket = {
  get(key: string): Promise<{ body: ReadableStream } | null>;
  put(key: string, value: ArrayBuffer): Promise<unknown>;
};

/** R2 object key for a page-cache key (a URL); grouped by build for lifecycle rules. */
export function objectKey(cacheKey: string, buildId: string): string {
  const url = new URL(cacheKey);
  return `${PREFIX}${buildId}/${url.host}${url.pathname}${url.search}`;
}

async function gzip(text: string): Promise<ArrayBuffer> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

async function gunzip(body: ReadableStream): Promise<string> {
  return new Response(body.pipeThrough(new DecompressionStream("gzip"))).text();
}

const storedAt = (res: Response) => Number(res.headers.get(STORED_AT) ?? 0);

export function tieredPageStore({
  edge,
  bucket,
  buildId,
  waitUntil,
  now = Date.now,
}: {
  edge: PageStore;
  bucket: PageBucket;
  buildId: string;
  waitUntil: (p: Promise<unknown>) => void;
  now?: () => number;
}): PageStore {
  return {
    async match(key) {
      const near = await edge.match(key);
      if (near && (now() - storedAt(near)) / 1000 <= FRESH_SECONDS) return near;
      const obj = await bucket.get(objectKey(String(key), buildId));
      if (!obj) return undefined;
      // One object: the headers as a JSON line, then the HTML.
      const text = await gunzip(obj.body);
      const nl = text.indexOf("\n");
      const res = new Response(text.slice(nl + 1), { headers: JSON.parse(text.slice(0, nl)) });
      if ((now() - storedAt(res)) / 1000 > R2_MAX_SECONDS) return undefined;
      if (near && storedAt(near) >= storedAt(res)) return near;
      waitUntil(edge.put(key, res.clone()).catch(() => {}));
      return res;
    },

    async put(key, res) {
      if (!buildId || res.headers.get(BUILD_HEADER) !== buildId) return;
      const copy = res.clone();
      const body = `${JSON.stringify([...res.headers])}\n${await copy.text()}`;
      await Promise.all([edge.put(key, res), bucket.put(objectKey(String(key), buildId), await gzip(body))]);
    },
  };
}
