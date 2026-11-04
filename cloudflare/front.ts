/**
 * Front Worker on www + apex (wrangler.front.jsonc). It answers public pages
 * from the tiered page store (src/lib/cloudflare/page-store.ts) and hands
 * everything else — and every page it has no copy of — to the app Worker
 * through a service binding, unchanged.
 *
 * It exists because the app Worker's ~27 MB bundle takes 1–3 s to start in a
 * fresh isolate, so even its own edge-cache hits were slow on a cold
 * isolate. This Worker imports nothing from Next and starts in milliseconds.
 */
import { cachedPage, isCacheableDocumentRequest } from "../src/lib/cloudflare/page-cache";
import { tieredPageStore } from "../src/lib/cloudflare/page-store";

type Env = {
  /** The app Worker (mmg-law-firm / mmg-law-firm-staging). */
  APP: Fetcher;
  /** The app's R2 cache bucket; pages live under `edge-pages/`. */
  PAGES: R2Bucket;
  /** Next build id of the app build deployed with this Worker (deploy workflow). */
  BUILD_ID?: string;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const render = (req: Request) => env.APP.fetch(req);
    if (!env.BUILD_ID || !isCacheableDocumentRequest(request)) return render(request);
    const waitUntil = (p: Promise<unknown>) => ctx.waitUntil(p);
    const store = tieredPageStore({ edge: caches.default, bucket: env.PAGES, buildId: env.BUILD_ID, waitUntil });
    return cachedPage(request, store, render, waitUntil, Date.now, env.BUILD_ID);
  },
} satisfies ExportedHandler<Env>;
