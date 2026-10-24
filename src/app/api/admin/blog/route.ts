import "server-only";

import {
  authenticateApi,
  clampInt,
  json,
  parseJsonBody,
  type ApiPrincipal,
} from "@/lib/api/auth";
import {
  BLOG_COPY_FIELDS,
  BLOG_SELECT,
  CreateBlogInput,
  logApiAudit,
  revalidateBlog,
  slugify,
  uniqueSlug,
  type CreateBlogData,
} from "@/lib/api/blog";
import { findCoveringPost } from "@/lib/api/blog-dedupe";
import { publishPolicyDenial } from "@/lib/api/blog-policy";
import { withIdempotency } from "@/lib/api/idempotency";
import {
  assertRunRunning,
  assertTopicClaimable,
  linkPost,
  skipTopicAsCovered,
} from "@/lib/content-agent/blog-linkage";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/blog — list posts (drafts included).
 * Query: status=all|published|draft|needs_review|approved|rejected
 * (default all), limit (1–100, default 20), offset (default 0).
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["blog:read"]);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "all";
  const limit = clampInt(url.searchParams.get("limit"), 1, 100, 20);
  const offset = Math.max(clampInt(url.searchParams.get("offset"), 0, 1e9, 0), 0);

  const supabase = getServiceSupabase();
  let q = supabase
    .from("blog_posts")
    .select(BLOG_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status === "published") q = q.eq("is_published", true);
  else if (status === "draft") q = q.eq("is_published", false);
  else if (["needs_review", "approved", "rejected"].includes(status)) {
    q = q.eq("review_status", status);
  }

  const { data, error, count } = await q;
  if (error) return json(500, { error: error.message });
  return json(200, { posts: data ?? [], count: count ?? 0, limit, offset });
}

/**
 * POST /api/admin/blog — create a post. `title` + `body_md` required; slug is
 * auto-derived (and de-duplicated) when omitted.
 *
 * Publishing policy: API-created posts default to a draft awaiting review
 * (`review_status = needs_review`). `is_published: true` requires the
 * `blog:publish` scope AND `auto_publish` enabled in the active agent
 * instructions, unless the key holds `agent:admin`.
 *
 * Content-agent linkage: pass `run_id` (a running run) and/or `topic_id` (a
 * queued/claimed topic) and the post is attached to both.
 *
 * Idempotent when an `Idempotency-Key` header is sent.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["blog:write"]);
  if (!auth.ok) return auth.response;

  const raw = await req.text();
  return withIdempotency(req, auth.principal, raw, async () => {
    const parsedBody = parseJsonBody(raw);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = CreateBlogInput.safeParse(parsedBody.body);
    if (!parsed.success) {
      return json(422, { error: "Validation failed.", issues: parsed.error.flatten() });
    }
    return createPost(parsed.data, auth.principal);
  });
}

async function createPost(d: CreateBlogData, principal: ApiPrincipal): Promise<Response> {
  const supabase = getServiceSupabase();

  const wantsPublish = d.is_published === true;
  if (wantsPublish) {
    const denied = await publishPolicyDenial(supabase, principal);
    if (denied) return denied;
  }
  if (d.run_id) {
    const check = await assertRunRunning(supabase, d.run_id);
    if (!check.ok) return json(check.status, { error: check.error });
  }
  if (d.topic_id) {
    const check = await assertTopicClaimable(supabase, d.topic_id, d.run_id);
    if (!check.ok) return json(check.status, { error: check.error });
  }

  // Refuse a second post on a topic the site already covers. The agent
  // used to get a quiet "-2", "-3" slug here; now it gets a 409 it can
  // report, and its topic leaves the queue so tomorrow's run won't retry.
  const base = d.slug ?? slugify(d.title);
  if (!d.allow_duplicate) {
    const covering = await findCoveringPost(supabase, { slug: base, title: d.title });
    if (covering) {
      if (d.topic_id) {
        await skipTopicAsCovered(supabase, d.topic_id, covering);
      }
      return json(409, {
        error: "duplicate_topic",
        message: `A post already covers this topic: /blog/${covering.slug} ("${covering.title}"${covering.is_published ? "" : ", draft"}). Pick a different angle or update the existing post. Pass allow_duplicate:true to override (owner tooling only).`,
        existing: {
          id: covering.id,
          slug: covering.slug,
          title: covering.title,
          is_published: covering.is_published,
          public_url: `/blog/${covering.slug}`,
        },
      });
    }
  }
  const slug = d.allow_duplicate ? await uniqueSlug(supabase, base) : base;
  const publishedAt = d.published_at ?? (wantsPublish ? new Date().toISOString() : null);
  const reviewStatus = wantsPublish ? "published" : (d.review_status ?? "needs_review");

  const row: Record<string, unknown> = {
    slug,
    is_published: wantsPublish,
    published_at: publishedAt,
    review_status: reviewStatus,
    created_via: d.run_id ? "agent" : "admin_api",
    topic_id: d.topic_id ?? null,
    tags: d.tags ?? [],
    secondary_keywords: d.secondary_keywords ?? [],
    practice_area_ids: d.practice_area_ids ?? [],
    related_county_ids: d.related_county_ids ?? [],
  };
  for (const key of BLOG_COPY_FIELDS) {
    const v = d[key];
    if (v !== undefined && !(key in row)) row[key] = v ?? null;
  }
  if (!d.author_name) delete row.author_name; // keep the column default

  const { data: inserted, error } = await supabase
    .from("blog_posts")
    .insert(row)
    .select(BLOG_SELECT)
    .single();
  if (error) {
    // 23505 = unique violation (slug race).
    return json(error.code === "23505" ? 409 : 500, { error: error.message });
  }

  const post = inserted as { id: string; slug: string; review_status: string };
  await linkPost(supabase, {
    postId: post.id,
    runId: d.run_id,
    topicId: d.topic_id ?? null,
    published: wantsPublish,
  });
  await logApiAudit(
    supabase,
    {
      entity_id: post.id,
      action: wantsPublish ? "publish" : "create",
      diff: { slug, is_published: wantsPublish, review_status: reviewStatus },
    },
    principal,
    d.run_id ?? null,
  );
  revalidateBlog(slug);
  return json(201, {
    post: inserted,
    public_url: `/blog/${slug}`,
    review_status: reviewStatus,
  });
}
