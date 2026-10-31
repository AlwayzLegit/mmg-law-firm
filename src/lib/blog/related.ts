import type { BlogPostSummary } from "@/lib/data/blog";

/** Stable 32-bit FNV-1a hash, for a per-page but deterministic tie-break. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** "Motorcycle Accidents", "motorcycle-accidents" and "motorcycle accident" match. */
const norm = (t: string) => t.toLowerCase().replace(/[-_]+/g, " ").trim().replace(/s$/, "");

function overlap(a: { tags: string[] }, b: { tags: string[] }): number {
  const tags = new Set(a.tags.map(norm));
  let n = 0;
  for (const t of new Set(b.tags.map(norm))) if (tags.has(t)) n += 1;
  return n;
}

/**
 * Rank candidate posts by tag overlap with the current post, ties broken by
 * a hash of the two slugs. Posts with no overlap come last, so the sidebar
 * never looks empty.
 */
function ranked<T extends { slug: string; tags: string[] }>(
  current: { slug: string; tags: string[] },
  candidates: T[],
): T[] {
  return candidates
    .filter((p) => p.slug !== current.slug)
    .map((p) => ({ post: p, overlap: overlap(current, p), tie: hash(`${current.slug}>${p.slug}`) }))
    .sort((a, b) => b.overlap - a.overlap || a.tie - b.tie)
    .map((s) => s.post);
}

/**
 * Related posts for every post at once. Each post keeps its `limit - 1` most
 * related links; the last slot goes first to a post nothing else links to
 * yet (the most related such post that shares a tag), so every post that
 * shares a tag with another gets at least one inbound link. Ranking alone sent every sidebar to the same well-tagged posts and
 * left older ones linked only from /blog (Semrush "pages with only one
 * internal link"). Deterministic for a given post list, so pages rendered
 * separately agree.
 */
export function relatedPostsMap<T extends { slug: string; tags: string[] }>(
  posts: T[],
  limit = 3,
): Map<string, T[]> {
  const sorted = [...posts].sort((a, b) => a.slug.localeCompare(b.slug));
  const ranks = new Map(sorted.map((p) => [p.slug, ranked(p, sorted)]));
  const out = new Map(sorted.map((p) => [p.slug, ranks.get(p.slug)!.slice(0, Math.max(0, limit - 1))]));
  if (limit < 1) return out;

  const linked = new Set([...out.values()].flat().map((p) => p.slug));
  const open = new Set(sorted.map((p) => p.slug));
  for (const target of sorted) {
    if (linked.has(target.slug)) continue;
    const source = ranks.get(target.slug)!.find(
      (s) =>
        open.has(s.slug) &&
        overlap(s, target) > 0 &&
        !out.get(s.slug)!.some((p) => p.slug === target.slug),
    );
    if (!source) continue;
    out.get(source.slug)!.push(target);
    open.delete(source.slug);
    linked.add(target.slug);
  }

  for (const p of sorted) {
    const list = out.get(p.slug)!;
    for (const c of ranks.get(p.slug)!) {
      if (list.length >= limit) break;
      if (!list.some((x) => x.slug === c.slug)) list.push(c);
    }
  }
  return out;
}

/**
 * Up to `limit` related posts for `current`, consistent with
 * relatedPostsMap over the same candidates. Excludes the post itself.
 */
export function relatedPosts(
  current: { slug: string; tags: string[] },
  candidates: BlogPostSummary[],
  limit = 3,
): BlogPostSummary[] {
  const all = candidates.some((p) => p.slug === current.slug)
    ? candidates
    : [...candidates, current as BlogPostSummary];
  return relatedPostsMap(all, limit).get(current.slug) ?? [];
}
