import "server-only";

import { z } from "zod";

import { authorizeAdminApi, json } from "@/lib/api/auth";
import {
  BLOG_SELECT,
  logApiAudit,
  revalidateBlog,
  UpdateBlogInput,
} from "@/lib/api/blog";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Id = z.string().uuid();
type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/blog/:id — fetch one post (draft or published). */
export async function GET(req: Request, ctx: Ctx): Promise<Response> {
  const denied = authorizeAdminApi(req);
  if (denied) return denied;
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
  const denied = authorizeAdminApi(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return json(400, { error: "Invalid id." });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Body must be valid JSON." });
  }
  const parsed = UpdateBlogInput.safeParse(body);
  if (!parsed.success) {
    return json(422, {
      error: "Validation failed.",
      issues: parsed.error.flatten(),
    });
  }
  const d = parsed.data;

  const supabase = getServiceSupabase();
  const { data: current, error: curErr } = await supabase
    .from("blog_posts")
    .select("slug, published_at")
    .eq("id", id)
    .maybeSingle();
  if (curErr) return json(500, { error: curErr.message });
  if (!current) return json(404, { error: "Post not found." });

  const updates: Record<string, unknown> = {};
  for (const key of [
    "title",
    "body_md",
    "subtitle",
    "excerpt",
    "hero_image_url",
    "meta_description",
    "tags",
    "practice_area_ids",
    "related_county_ids",
    "author_name",
  ] as const) {
    if (d[key] !== undefined) updates[key] = d[key];
  }

  // Slug change → enforce uniqueness against other rows.
  if (d.slug !== undefined && d.slug !== current.slug) {
    const { data: clash } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", d.slug)
      .neq("id", id)
      .maybeSingle();
    if (clash) return json(409, { error: "Slug already in use." });
    updates.slug = d.slug;
  }

  // Publish state + timestamp. Publishing with no date set → now.
  if (d.is_published !== undefined) {
    updates.is_published = d.is_published;
    if (d.is_published) {
      updates.published_at =
        d.published_at ?? current.published_at ?? new Date().toISOString();
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

  await logApiAudit(supabase, { entity_id: id, action: "edit" });
  revalidateBlog(current.slug);
  if (row.slug !== current.slug) revalidateBlog(row.slug as string);
  return json(200, { post: row });
}

/** DELETE /api/admin/blog/:id — remove a post (published or not). */
export async function DELETE(req: Request, ctx: Ctx): Promise<Response> {
  const denied = authorizeAdminApi(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return json(400, { error: "Invalid id." });

  const supabase = getServiceSupabase();
  const { data: row } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  if (!row) return json(404, { error: "Post not found." });

  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return json(500, { error: error.message });

  await logApiAudit(supabase, {
    entity_id: id,
    action: "delete",
    diff: { slug: row.slug },
  });
  revalidateBlog(row.slug as string);
  return json(200, { deleted: true, id });
}
