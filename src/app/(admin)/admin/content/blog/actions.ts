"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Slug derivation: lowercase, ASCII fold, non-alphanumerics → hyphen,
 * collapse runs, trim. Conservative — admins can override before saving.
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const SlugRe = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const CreateInput = z.object({
  title: z.string().trim().min(2).max(160),
});

const UpdateInput = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(SlugRe, "Slug must be lowercase letters, numbers, and hyphens only"),
  subtitle: z.string().trim().max(220).optional().nullable(),
  body_md: z.string().min(1, "Post body is required").max(50000),
  excerpt: z.string().trim().max(400).optional().nullable(),
  hero_image_url: z
    .string()
    .trim()
    .url("Hero image must be a full URL (or empty)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  meta_description: z.string().trim().max(220).optional().nullable(),
  tags: z.string().trim().max(400).optional().nullable(),
  published_at: z
    .string()
    .trim()
    .regex(
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}|\d{4}-\d{2}-\d{2})$/,
      "Date must be YYYY-MM-DD or YYYY-MM-DDTHH:MM",
    )
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

const PublishInput = z.object({
  id: z.string().uuid(),
  is_published: z.boolean(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };
type CreateOk = { ok: true; id: string; slug: string };

function emptyToNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  return v.trim() === "" ? null : v;
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 16);
}

export async function createBlogPost(
  formData: FormData,
): Promise<CreateOk | { ok: false; error: string }> {
  const { user } = await requireAdmin();

  const parsed = CreateInput.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    return { ok: false, error: "Title is required (2–160 chars)." };
  }

  const supabase = await getServerSupabase();

  // Find a unique slug — append -2, -3, etc. if the base is taken.
  const base = slugify(parsed.data.title) || "untitled";
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const { data } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) break;
    slug = `${base}-${i}`;
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      slug,
      title: parsed.data.title,
      body_md: "Start writing here...",
      is_published: false,
    })
    .select("id, slug")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Couldn't create post." };
  }

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "blog_posts",
    entity_id: data.id,
    action: "create",
    diff: { slug: data.slug },
  });

  revalidatePath("/admin/content/blog");

  return { ok: true, id: data.id, slug: data.slug };
}

export async function createBlogPostAndRedirect(
  formData: FormData,
): Promise<{ ok: false; error: string } | undefined> {
  const result = await createBlogPost(formData);
  if (!result.ok) return result;
  redirect(`/admin/content/blog/${result.id}`);
}

export async function updateBlogPost(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = UpdateInput.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    subtitle: formData.get("subtitle"),
    body_md: formData.get("body_md"),
    excerpt: formData.get("excerpt"),
    hero_image_url: formData.get("hero_image_url"),
    meta_description: formData.get("meta_description"),
    tags: formData.get("tags"),
    published_at: formData.get("published_at"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await getServerSupabase();

  // Slug uniqueness — only check if slug changed.
  const { data: current } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (current && current.slug !== parsed.data.slug) {
    const { data: clash } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", parsed.data.slug)
      .maybeSingle();
    if (clash) {
      return {
        ok: false,
        error: "That slug is already in use by another post.",
      };
    }
  }

  // Normalize published_at: 'YYYY-MM-DD' → end-of-day UTC; 'YYYY-MM-DDTHH:MM'
  // → ISO with seconds. Empty → null.
  let publishedAt: string | null = null;
  if (parsed.data.published_at) {
    const v = parsed.data.published_at;
    publishedAt = v.includes("T") ? `${v}:00.000Z` : `${v}T00:00:00.000Z`;
  }

  const { error } = await supabase
    .from("blog_posts")
    .update({
      title: parsed.data.title,
      slug: parsed.data.slug,
      subtitle: emptyToNull(parsed.data.subtitle),
      body_md: parsed.data.body_md,
      excerpt: emptyToNull(parsed.data.excerpt),
      hero_image_url: parsed.data.hero_image_url ?? null,
      meta_description: emptyToNull(parsed.data.meta_description),
      tags: parseTags(parsed.data.tags),
      published_at: publishedAt,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "blog_posts",
    entity_id: parsed.data.id,
    action: "edit",
  });

  revalidatePath(`/admin/content/blog/${parsed.data.id}`);
  revalidatePath("/admin/content/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${parsed.data.slug}`);
  // Old slug, if it changed, will rebuild on its next request and 404.

  return { ok: true };
}

export async function togglePublishBlogPost(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = PublishInput.safeParse({
    id: formData.get("id"),
    is_published: formData.get("is_published") === "true",
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await getServerSupabase();

  // Make sure published_at is set when publishing — default to now if it's
  // null. Don't clobber a future-dated scheduled publish if the admin set one.
  const updates: Record<string, unknown> = {
    is_published: parsed.data.is_published,
  };
  if (parsed.data.is_published) {
    const { data: row } = await supabase
      .from("blog_posts")
      .select("published_at")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (row && !row.published_at) {
      updates.published_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from("blog_posts")
    .update(updates)
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "blog_posts",
    entity_id: parsed.data.id,
    action: parsed.data.is_published ? "publish" : "unpublish",
  });

  revalidatePath(`/admin/content/blog/${parsed.data.id}`);
  revalidatePath("/admin/content/blog");
  revalidatePath("/blog");

  return { ok: true };
}

export async function deleteBlogPost(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "Invalid id" };
  }

  const supabase = await getServerSupabase();
  const { data: row } = await supabase
    .from("blog_posts")
    .select("slug, is_published")
    .eq("id", id)
    .maybeSingle();
  if (row?.is_published) {
    return {
      ok: false,
      error:
        "Unpublish before deleting — keeps the public URL from breaking abruptly.",
    };
  }

  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "blog_posts",
    entity_id: id,
    action: "delete",
    diff: { slug: row?.slug },
  });

  revalidatePath("/admin/content/blog");
  revalidatePath("/blog");
  return { ok: true };
}
