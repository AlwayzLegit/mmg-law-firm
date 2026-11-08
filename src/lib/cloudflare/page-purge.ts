/**
 * Drops stored pages (src/lib/cloudflare/page-store.ts) when the app revalidates
 * them, so a published post or admin edit reaches visitors on the next request.
 *
 * Without this a stored copy only refreshes when someone visits it: a page
 * serves stale once, then re-renders in the background. On a low-traffic page
 * that can take most of a day; the blog index left out a new post for 17 hours
 * and Semrush's audit saw the post with no links to it.
 *
 * Every revalidatePath call ends up in the tag cache's writeTags, which
 * open-next.config.ts wraps, so none of them has to know about the store.
 *
 * The keys this deletes are returned so page-warm.ts can store fresh copies
 * before anyone asks for them: the first visitor to a dropped page otherwise
 * waits for a full render (Semrush's nightly crawl timed /blog and each new
 * post at just over 3 s the night they were published).
 */
import { PREFIX } from "./page-store";

const IMPLICIT = "_N_T_";
const R2_DELETE_LIMIT = 1000;

/** Stored pages to drop: keys under `prefix`, optionally only at one URL depth. */
export type PurgeRule = { prefix: string; depth?: number };

/** The slice of an R2 bucket binding purging uses. */
export type PurgeBucket = {
  list(options: {
    prefix: string;
    cursor?: string;
  }): Promise<{ objects: { key: string }[]; truncated: boolean; cursor?: string }>;
  delete(keys: string[]): Promise<unknown>;
};

const segments = (path: string) => path.split("/").filter(Boolean).length;

/**
 * Rules for one revalidate tag. Next writes revalidatePath("/x") as `_N_T_/x`,
 * and revalidatePath("/x", type) as `_N_T_/x/<type>`. Every stored key has a
 * query string (the deploy id), so `/x?` matches that page and no child of it.
 */
export function purgeRules(tag: string): PurgeRule[] {
  if (!tag.startsWith(IMPLICIT)) return [];
  const path = tag.slice(IMPLICIT.length);
  if (path === "/admin" || path.startsWith("/admin/")) return [];
  if (path === "/layout") return [{ prefix: "/" }];
  if (path === "/index" || path === "/page") return [{ prefix: "/?" }];
  if (path.endsWith("/layout")) {
    const base = path.slice(0, -"/layout".length);
    return [{ prefix: `${base}?` }, { prefix: `${base}/` }];
  }
  if (path.endsWith("/page")) {
    const route = path.slice(0, -"/page".length);
    const dynamic = route.indexOf("[");
    if (dynamic === -1) return [{ prefix: `${route}?` }];
    return [{ prefix: route.slice(0, dynamic), depth: segments(route) }];
  }
  return [{ prefix: `${path}?` }];
}

/** Delete the stored pages the tags cover; returns the keys deleted. */
export async function purgeStoredPages({
  tags,
  bucket,
  buildId,
  host,
}: {
  tags: string[];
  bucket: PurgeBucket;
  buildId: string;
  host: string;
}): Promise<string[]> {
  const root = `${PREFIX}${buildId}/${host}`;
  const rules = new Map(tags.flatMap(purgeRules).map((r) => [`${r.prefix}|${r.depth ?? ""}`, r]));
  const deleted = new Set<string>();
  for (const { prefix, depth } of rules.values()) {
    // List everything first: deleting between list pages can shift the cursor.
    const keys: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await bucket.list({ prefix: `${root}${prefix}`, cursor });
      keys.push(...page.objects.map((o) => o.key));
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    const matched = keys.filter((key) => depth === undefined || segments(key.slice(root.length).split("?")[0]) === depth);
    for (let i = 0; i < matched.length; i += R2_DELETE_LIMIT) {
      await bucket.delete(matched.slice(i, i + R2_DELETE_LIMIT));
    }
    matched.forEach((key) => deleted.add(key));
  }
  return [...deleted];
}
