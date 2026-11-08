import { defineCloudflareConfig, getCloudflareContext } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

import { purgeStoredPages, type PurgeBucket } from "./src/lib/cloudflare/page-purge";
import { getPageRenderer, warmStoredPages } from "./src/lib/cloudflare/page-warm";

type PurgeEnv = {
  NEXT_INC_CACHE_R2_BUCKET: PurgeBucket & { put(key: string, value: ArrayBuffer): Promise<unknown> };
  BUILD_ID?: string;
  NEXT_PUBLIC_SITE_URL?: string;
};

/**
 * Every revalidatePath ends here, so this is where the front Worker's stored
 * pages get dropped (src/lib/cloudflare/page-purge.ts) and, in the background,
 * rendered again and stored (page-warm.ts) so the first visitor does not wait
 * for a cold render. A failed purge must not fail the publish: the stored copy
 * then just refreshes on its next visit.
 */
const tagCache = doShardedTagCache({ baseShardSize: 12 });
const writeTags = tagCache.writeTags.bind(tagCache);
tagCache.writeTags = async (tags) => {
  await writeTags(tags);
  try {
    const { env: rawEnv, ctx } = getCloudflareContext();
    const env = rawEnv as unknown as PurgeEnv;
    if (!env.BUILD_ID || !env.NEXT_PUBLIC_SITE_URL) return;
    const buildId = env.BUILD_ID;
    const bucket = env.NEXT_INC_CACHE_R2_BUCKET;
    const keys = await purgeStoredPages({
      tags: tags.map((t) => (typeof t === "string" ? t : t.tag)),
      bucket,
      buildId,
      host: new URL(env.NEXT_PUBLIC_SITE_URL).host,
    });
    const render = getPageRenderer();
    if (keys.length && render) {
      ctx.waitUntil(
        warmStoredPages({ keys, render, bucket, buildId })
          .then((n) => console.log(`[page-warm] stored ${n} of ${keys.length} dropped pages`))
          .catch((err) => console.error("[page-warm] failed", err)),
      );
    }
  } catch (err) {
    console.error("[page-purge] failed", err);
  }
};

/**
 * OpenNext → Cloudflare Workers build (docs/cloudflare-migration-plan.md).
 *
 * - R2 holds the ISR incremental cache (rendered HTML / RSC payloads).
 * - A Durable Object queue coalesces background revalidations.
 * - A sharded Durable Object tag cache backs revalidatePath/revalidateTag,
 *   which the admin's content actions call ~200 times.
 */
export default {
  ...defineCloudflareConfig({
    incrementalCache: r2IncrementalCache,
    queue: doQueue,
    tagCache,
    enableCacheInterception: true,
  }),
  // Turbopack output left the Sentry instrumentation hook pointing at a server
  // chunk OpenNext did not carry into the bundle ("Not found
  // server/chunks/[root-of-the-server]__….js"), so every request 500'd under
  // workerd. The Worker build uses webpack, which OpenNext traces reliably;
  // the Vercel build keeps Turbopack.
  buildCommand: "pnpm exec next build --webpack",
};
