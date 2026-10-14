import "server-only";

import { z } from "zod";

import { authenticateApi, json, parseJsonBody } from "@/lib/api/auth";
import {
  BLOG_COPY_FIELDS,
  BLOG_SELECT,
  logApiAudit,
  revalidateBlog,
  UpdateBlogInput,
} from "@/lib/api/blog";
import { publishPolicyDenial } from "@/lib/api/blog-policy";
import { hasScope } from "@/lib/api/scopes";
import { markTopicPublishedForPost } from "@/lib/content-agent/blog-linkage";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Id = z.string().uuid();
type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/blog/:id — fetch one post (draft or published). */
export async function GET(req: Request, ctx: Ctx): Promise<Response> {
  const auth = await authenticateApi(req, ["blog:read"]);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return json(400, { error: "Invalid id." });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) return json(500, { error: error.message });
  if (!data) return json(404, { error: "Post not found." });
  return json(200, { post: data });
}

/** PATCH /api/admin/blog/:id — partial update of any field(s). */
export async function PATCH(req: Request, ctx: Ctx): Promise<Response> {
  const auth = await authenticateApi(req, ["blog:write"]);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return json(400, { error: "Invalid id." });

  const parsedBody = parseJsonBody(await req.text());
  if (!parsedBody.ok) return parsedBody.response;
  const parsed = UpdateBlogInput.safeParse(parsedBody.body);
  if (!parsed.success) {
    return json(422, { error: "Validation failed.", issues: parsed.error.flatten() });
  }
  const d = parsed.data;

  const supabase = getServiceSupabase();
  const { data: current, error: curErr } = await supabase
    .from("blog_posts")
    .select("slug, published_at, is_published, review_status")
    .eq("id", id)
    .maybeSingle();
  if (curErr) return json(500, { error: curErr.message });
  if (!current) return json(404, { error: "Post not found." });
  const cur = current as {
    slug: string;
    published_at: string | null;
    is_published: boolean;
    review_status: string;
  };

  const updates: Record<string, unknown> = {};
  for (const key of BLOG_COPY_FIELDS) {
    if (d[key] !== undefined) updates[key] = d[key];
  }
  if (d.topic_id !== undefined) updates.topic_id = d.topic_id;

  // Slug change → enforce uniqueness against other rows.
  if (d.slug !== undefined && d.slug !== cur.slug) {
    const { data: clash } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", d.slug)
      .neq("id", id)
      .maybeSingle();
    if (clash) return json(409, { error: "Slug already in use." });
    updates.slug = d.slug;
  }

  // review_status is an editorial decision: agent:admin (or legacy *) only.
  if (d.review_status !== undefined) {
    if (!hasScope(auth.principal.scopes, "agent:admin")) {
      return json(403, {
        error: "Changing review_status requires the agent:admin scope.",
        required: ["agent:admin"],
      });
    }
    updates.review_status = d.review_status;
  }

  // Publish state + timestamp. Publishing with no date set → now.
  if (d.is_published !== undefined) {
    if (d.is_published && !cur.is_published) {
      const denied = await publishPolicyDenial(supabase, auth.principal);
      if (denied) return denied;
    }
    updates.is_published = d.is_published;
    if (d.is_published) {
      updates.published_at =
        d.published_at ?? cur.published_at ?? new Date().toISOString();
    }
  }
  if (d.published_at !== undefined && updates.published_at === undefined) {
    updates.published_at = d.published_at; // may be null to unschedule
  }

  if (Object.keys(updates).length === 0) {
    return json(400, { error: "No updatable fields supplied." });
  }

  const { data: row, error } = await supabase
    .from("blog_posts")
    .update(updates)
    .eq("id", id)
    .select(BLOG_SELECT)
    .single();
  if (error) {
    return json(error.code === "23505" ? 409 : 500, { error: error.message });
  }

  const nowPublished = d.is_published === true && !cur.is_published;
  if (nowPublished) await markTopicPublishedForPost(supabase, id);

  await logApiAudit(
    supabase,
    {
      entity_id: id,
      action: nowPublished
        ? "publish"
        : d.is_published === false && cur.is_published
          ? "unpublish"
          : "edit",
      diff: { fields: Object.keys(updates) },
    },
    auth.principal,
    d.run_id ?? null,
  );
  revalidateBlog(cur.slug);
  const next = row as { slug: string };
  if (next.slug !== cur.slug) revalidateBlog(next.slug);
  return json(200, { post: row, public_url: `/blog/${next.slug}` });
}

/**
 * DELETE /api/admin/blog/:id — remove a draft. Published posts must be
 * unpublished first (parity with the admin UI), so a public URL never
 * disappears by accident.
 */
export async function DELETE(req: Request, ctx: Ctx): Promise<Response> {
  const auth = await authenticateApi(req, ["blog:write"]);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return json(400, { error: "Invalid id." });

  const supabase = getServiceSupabase();
  const { data: row } = await supabase
    .from("blog_posts")
    .select("slug, is_published")
    .eq("id", id)
    .maybeSingle();
  if (!row) return json(404, { error: "Post not found." });
  const r = row as { slug: string; is_published: boolean };
  if (r.is_published) {
    return json(409, {
      error: "Unpublish the post before deleting it (PATCH { is_published: false }).",
    });
  }

  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return json(500, { error: error.message });

  await logApiAudit(
    supabase,
    { entity_id: id, action: "delete", diff: { slug: r.slug } },
    auth.principal,
  );
  revalidateBlog(r.slug);
  return json(200, { deleted: true, id });
}
