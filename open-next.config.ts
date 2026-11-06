import { defineCloudflareConfig, getCloudflareContext } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

import { purgeStoredPages, type PurgeBucket } from "./src/lib/cloudflare/page-purge";

type PurgeEnv = { NEXT_INC_CACHE_R2_BUCKET: PurgeBucket; BUILD_ID?: string; NEXT_PUBLIC_SITE_URL?: string };

/**
 * Every revalidatePath ends here, so this is where the front Worker's stored
 * pages get dropped (src/lib/cloudflare/page-purge.ts). A failed purge must not
 * fail the publish: the stored copy then just refreshes on its next visit.
 */
const tagCache = doShardedTagCache({ baseShardSize: 12 });
const writeTags = tagCache.writeTags.bind(tagCache);
tagCache.writeTags = async (tags) => {
  await writeTags(tags);
  try {
    const env = getCloudflareContext().env as unknown as PurgeEnv;
    if (!env.BUILD_ID || !env.NEXT_PUBLIC_SITE_URL) return;
    await purgeStoredPages({
      tags: tags.map((t) => (typeof t === "string" ? t : t.tag)),
      bucket: env.NEXT_INC_CACHE_R2_BUCKET,
      buildId: env.BUILD_ID,
      host: new URL(env.NEXT_PUBLIC_SITE_URL).host,
    });
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
