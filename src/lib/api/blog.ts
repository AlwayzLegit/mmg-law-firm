import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ApiPrincipal } from "./auth";

/** Columns selected/returned for a blog post via the API. */
export const BLOG_SELECT =
  "id, slug, title, subtitle, hero_image_url, hero_image_alt, body_md, excerpt, author_name, tags, practice_area_ids, related_county_ids, meta_description, primary_keyword, secondary_keywords, review_status, topic_id, created_via, word_count, is_published, published_at, created_at, updated_at";

/**
 * Slug derivation — mirrors the admin editor: lowercase, ASCII-fold,
 * non-alphanumerics → hyphen, collapse runs, trim, cap length.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const SlugRe = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

// Accept tags as a JSON array or a comma-separated string; normalize to
// a clean, de-duplicated, capped array of trimmed strings.
const StringList = (max: number) =>
  z.union([z.array(z.string()), z.string()]).transform((v) => {
    const raw = Array.isArray(v) ? v : v.split(",");
    return Array.from(new Set(raw.map((t) => t.trim()).filter(Boolean))).slice(
      0,
      max,
    );
  });

const UuidArray = z.array(z.string().uuid()).max(50);

// ISO 8601 datetime (e.g. 2026-06-20T15:00:00Z) or a bare date.
const PublishedAt = z
  .string()
  .trim()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
  .transform((v) => new Date(v).toISOString());

export const REVIEW_STATUSES = [
  "draft",
  "needs_review",
  "approved",
  "published",
  "rejected",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const CreateBlogInput = z.object({
  title: z.string().trim().min(2).max(160),
  body_md: z.string().min(1, "body_md is required").max(50000),
  slug: z.string().trim().min(2).max(80).regex(SlugRe).optional(),
  subtitle: z.string().trim().max(220).nullish(),
  excerpt: z.string().trim().max(400).nullish(),
  hero_image_url: z.string().trim().url().nullish(),
  hero_image_alt: z.string().trim().max(200).nullish(),
  meta_description: z.string().trim().max(220).nullish(),
  author_name: z.string().trim().min(2).max(120).optional(),
  tags: StringList(16).optional(),
  practice_area_ids: UuidArray.optional(),
  related_county_ids: UuidArray.optional(),
  primary_keyword: z.string().trim().max(120).nullish(),
  secondary_keywords: StringList(10).optional(),
  /** Content-agent linkage: the run that produced this post. */
  run_id: z.string().uuid().optional(),
  /** Content-agent linkage: the queue topic this post fulfils. */
  topic_id: z.string().uuid().nullish(),
  review_status: z.enum(REVIEW_STATUSES).optional(),
  is_published: z.boolean().optional(),
  published_at: PublishedAt.nullish(),
});
export type CreateBlogData = z.infer<typeof CreateBlogInput>;

// Partial update — every field optional, but reject an empty body.
export const UpdateBlogInput = CreateBlogInput.partial()
  .extend({
    title: z.string().trim().min(2).max(160).optional(),
    body_md: z.string().min(1).max(50000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "No fields to update");
export type UpdateBlogData = z.infer<typeof UpdateBlogInput>;

/** Plain columns copied straight from a validated payload into the row. */
export const BLOG_COPY_FIELDS = [
  "title",
  "body_md",
  "subtitle",
  "excerpt",
  "hero_image_url",
  "hero_image_alt",
  "meta_description",
  "tags",
  "practice_area_ids",
  "related_county_ids",
  "author_name",
  "primary_keyword",
  "secondary_keywords",
] as const;

export type SupabaseAny = SupabaseClient;

/** Find a slug not already taken, appending -2, -3, … when needed. */
export async function uniqueSlug(
  supabase: SupabaseAny,
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = base || "untitled";
  let slug = root;
  for (let i = 2; i < 100; i++) {
    let q = supabase.from("blog_posts").select("id").eq("slug", slug).limit(1);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

/**
 * Best-effort audit row for an API write. There is no user session, so
 * `actor_id` is null and the principal (API key) is recorded in `diff` for
 * attribution in the admin history panels.
 */
export async function logApiAudit(
  supabase: SupabaseAny,
  entry: {
    entity?: string;
    entity_id: string | null;
    action: string;
    diff?: Record<string, unknown>;
  },
  principal?: ApiPrincipal | null,
  runId?: string | null,
): Promise<void> {
  try {
    await supabase.from("audit_log").insert({
      actor_id: null,
      entity: entry.entity ?? "blog_posts",
      entity_id: entry.entity_id,
      action: entry.action,
      diff: {
        via: "admin_api",
        ...(principal
          ? { api_key_id: principal.id, api_key_name: principal.name }
          : {}),
        ...(runId ? { run_id: runId } : {}),
        ...(entry.diff ?? {}),
      },
    });
  } catch {
    // Audit gaps must never fail an API write.
  }
}

/** Revalidate the public + admin surfaces touched by a blog change. */
export function revalidateBlog(slug?: string | null): void {
  revalidatePath("/blog");
  revalidatePath("/admin/content/blog");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/blog/${slug}`);
}
