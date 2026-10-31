import type { BlogPostSummary } from "@/lib/data/blog";

/** Stable 32-bit FNV-1a hash, for a per-page but deterministic tie-break. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/**
 * Rank candidate posts by tag overlap with the current post. Ties are broken
 * by a hash of the two slugs rather than by date: date order sent every
 * post's sidebar links to the same few newest posts, leaving older ones
 * linked only from /blog (Semrush "pages with only one internal link").
 * Returns up to `limit` related posts; excludes the post itself.
 */
export function relatedPosts(
  current: { slug: string; tags: string[] },
  candidates: BlogPostSummary[],
  limit = 3,
): BlogPostSummary[] {
  const tags = new Set(current.tags.map((t) => t.toLowerCase()));
  const scored = candidates
    .filter((p) => p.slug !== current.slug)
    .map((p) => {
      let overlap = 0;
      for (const t of p.tags) if (tags.has(t.toLowerCase())) overlap += 1;
      return { post: p, overlap, tie: hash(`${current.slug}>${p.slug}`) };
    })
    .sort((a, b) => b.overlap - a.overlap || a.tie - b.tie);
  // If no overlap at all, still return the most recent posts so the sidebar
  // never looks broken.
  const withOverlap = scored.filter((s) => s.overlap > 0).map((s) => s.post);
  if (withOverlap.length >= limit) return withOverlap.slice(0, limit);
  const rest = scored.filter((s) => s.overlap === 0).map((s) => s.post);
  return [...withOverlap, ...rest].slice(0, limit);
}
