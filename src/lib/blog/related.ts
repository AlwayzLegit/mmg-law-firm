import type { BlogPostSummary } from "@/lib/data/blog";

/**
 * Rank candidate posts by tag overlap with the current post, breaking ties by
 * publish date (newer first). Returns up to `limit` related posts; excludes
 * the post itself.
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
      const ts = p.published_at ? new Date(p.published_at).getTime() : 0;
      return { post: p, overlap, ts };
    })
    .sort((a, b) => b.overlap - a.overlap || b.ts - a.ts);
  // If no overlap at all, still return the most recent posts so the sidebar
  // never looks broken.
  const withOverlap = scored.filter((s) => s.overlap > 0).map((s) => s.post);
  if (withOverlap.length >= limit) return withOverlap.slice(0, limit);
  const rest = scored.filter((s) => s.overlap === 0).map((s) => s.post);
  return [...withOverlap, ...rest].slice(0, limit);
}
