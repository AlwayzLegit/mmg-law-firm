import "server-only";

import { authorizeAdminApi, json } from "@/lib/api/auth";
import {
  BLOG_SELECT,
  CreateBlogInput,
  logApiAudit,
  revalidateBlog,
  slugify,
  uniqueSlug,
} from "@/lib/api/blog";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/blog — list posts (drafts included).
 * Query: status=all|published|draft (default all), limit (1–100, default 20),
 * offset (default 0).
 */
export async function GET(req: Request): Promise<Response> {
  const denied = authorizeAdminApi(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "all";
  const limit = clamp(Number(url.searchParams.get("limit") ?? 20), 1, 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);

  const supabase = getServiceSupabase();
  let q = supabase
    .from("blog_posts")
    .select(BLOG_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status === "published") q = q.eq("is_published", true);
  else if (status === "draft") q = q.eq("is_published", false);

  const { data, error, count } = await q;
  if (error) return json(500, { error: error.message });
  return json(200, { posts: data ?? [], count: count ?? 0, limit, offset });
}

/**
 * POST /api/admin/blog — create a post. `title` + `body_md` required; slug is
 * auto-derived (and de-duplicated) when omitted. Set `is_published: true` to
 * publish immediately (publishes "now" unless `published_at` is given).
 */
export async function POST(req: Request): Promise<Response> {
  const denied = authorizeAdminApi(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Body must be valid JSON." });
  }

  const parsed = CreateBlogInput.safeParse(body);
  if (!parsed.success) {
    return json(422, {
      error: "Validation failed.",
      issues: parsed.error.flatten(),
    });
  }
  const d = parsed.data;

  const supabase = getServiceSupabase();
  const slug = await uniqueSlug(supabase, d.slug ?? slugify(d.title));
  const isPublished = d.is_published ?? false;
  const publishedAt =
    d.published_at ?? (isPublished ? new Date().toISOString() : null);

  const { data: row, error } = await supabase
    .from("blog_posts")
    .insert({
      slug,
      title: d.title,
      body_md: d.body_md,
      subtitle: d.subtitle ?? null,
      excerpt: d.excerpt ?? null,
      hero_image_url: d.hero_image_url ?? null,
      meta_description: d.meta_description ?? null,
      tags: d.tags ?? [],
      practice_area_ids: d.practice_area_ids ?? [],
      related_county_ids: d.related_county_ids ?? [],
      is_published: isPublished,
      published_at: publishedAt,
      ...(d.author_name ? { author_name: d.author_name } : {}),
    })
    .select(BLOG_SELECT)
    .single();

  if (error) {
    // 23505 = unique violation (slug race).
    return json(error.code === "23505" ? 409 : 500, { error: error.message });
  }

  await logApiAudit(supabase, {
    entity_id: row.id as string,
    action: "create",
    diff: { slug, is_published: isPublished },
  });
  revalidateBlog(slug);
  return json(201, { post: row });
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(Math.max(n, lo), hi);
}
