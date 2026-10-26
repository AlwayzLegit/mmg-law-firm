import { getStaticSupabase, isSupabaseConfigured } from "@/lib/supabase/server";

export type BlogPostSummary = {
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  hero_image_url: string | null;
  author_name: string;
  tags: string[];
  meta_description: string | null;
  published_at: string | null;
};

export type BlogPostRow = BlogPostSummary & {
  body_md: string;
};

export async function getPublishedPosts(
  strict = false,
): Promise<BlogPostSummary[]> {
  if (!isSupabaseConfigured()) {
    if (strict)
      throw new Error("Sitemap requires the published content database");
    return [];
  }
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "slug, title, subtitle, excerpt, hero_image_url, author_name, tags, meta_description, published_at",
    )
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });
  if (error) {
    console.warn("[queries] blog index:", error.message);
    if (strict) throw new Error("Cannot load blog posts for sitemap");
    return [];
  }
  return (data ?? []) as BlogPostSummary[];
}

export async function getPostBySlug(slug: string): Promise<BlogPostRow | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "slug, title, subtitle, excerpt, hero_image_url, author_name, tags, meta_description, published_at, body_md",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (error) {
    console.warn("[queries] blog post:", error.message);
    return null;
  }
  return (data as BlogPostRow) ?? null;
}

/** source_path → destination from the admin `redirects` table (public read). */
export async function getRedirectMap(): Promise<Map<string, string>> {
  if (!isSupabaseConfigured()) return new Map();
  const supabase = getStaticSupabase();
  const { data, error } = await supabase.from("redirects").select("source_path, destination");
  if (error) {
    console.warn("[queries] redirects:", error.message);
    return new Map();
  }
  return new Map((data ?? []).map((r) => [r.source_path as string, r.destination as string]));
}
