import type { SupabaseClient } from "@supabase/supabase-js";

import { slugify } from "./blog";

/**
 * Duplicate-topic detection for blog posts.
 *
 * Why: the daily content agent kept re-writing the same twenty keywords.
 * Each run derived the same slug from the keyword, `uniqueSlug()` quietly
 * appended -2, -3 … and by October 53 of 128 posts were numbered copies of
 * an existing article, all competing with each other in search. A post that
 * covers a topic already on the site is refused, not renamed.
 */

export type CoveringPost = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
};

/** "dog-bite-lawyer-california-4" → "dog-bite-lawyer-california". */
export function topicKeyFromSlug(slug: string): string {
  return slug.toLowerCase().replace(/-\d+$/, "");
}

/** Title compared loosely: case, punctuation and filler words ignored. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !TITLE_FILLER.has(w))
    .join(" ");
}

const TITLE_FILLER = new Set([
  "a",
  "an",
  "the",
  "in",
  "of",
  "for",
  "and",
  "your",
  "you",
  "to",
  "what",
  "is",
  "are",
  "know",
  "rights",
  "guide",
]);

/** Does `candidate` (slug or keyword) land on the same topic key as `slug`? */
export function sameTopic(candidateSlugOrKeyword: string, existingSlug: string): boolean {
  const a = topicKeyFromSlug(slugify(candidateSlugOrKeyword));
  const b = topicKeyFromSlug(existingSlug);
  return a.length > 0 && a === b;
}

/**
 * Find an existing post that already covers the given slug / title / keyword.
 * Checks the slug family (`base`, `base-2`, `base-3` …) and a loose title
 * match. Published posts win over drafts; the oldest wins among equals.
 */
export async function findCoveringPost(
  supabase: SupabaseClient,
  input: { slug?: string | null; title?: string | null; keyword?: string | null; excludeId?: string },
): Promise<CoveringPost | null> {
  const keys = new Set<string>();
  for (const v of [input.slug, input.keyword, input.title]) {
    if (v) {
      const k = topicKeyFromSlug(slugify(v));
      if (k) keys.add(k);
    }
  }
  const titleKey = input.title ? normalizeTitle(input.title) : "";
  if (keys.size === 0 && !titleKey) return null;

  // One query per key family; tiny tables, so this is cheap and keeps the
  // matching logic in one place (below) instead of in SQL.
  const candidates = new Map<string, CoveringPost & { created_at: string }>();
  for (const key of keys) {
    const { data } = await supabase
      .from("blog_posts")
      .select("id, slug, title, is_published, created_at")
      .or(`slug.eq.${key},slug.like.${key}-%`)
      .limit(50);
    for (const row of (data ?? []) as Array<CoveringPost & { created_at: string }>) {
      candidates.set(row.id, row);
    }
  }
  if (titleKey) {
    const { data } = await supabase
      .from("blog_posts")
      .select("id, slug, title, is_published, created_at")
      .ilike("title", `%${input.title!.trim().slice(0, 40)}%`)
      .limit(50);
    for (const row of (data ?? []) as Array<CoveringPost & { created_at: string }>) {
      candidates.set(row.id, row);
    }
  }

  const matches = [...candidates.values()].filter((p) => {
    if (input.excludeId && p.id === input.excludeId) return false;
    const pk = topicKeyFromSlug(p.slug);
    if (keys.has(pk)) return true;
    return Boolean(titleKey) && normalizeTitle(p.title) === titleKey;
  });
  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    if (a.is_published !== b.is_published) return a.is_published ? -1 : 1;
    return a.created_at.localeCompare(b.created_at);
  });
  const { created_at: _c, ...best } = matches[0];
  void _c;
  return best;
}
