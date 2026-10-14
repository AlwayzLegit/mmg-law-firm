import "server-only";

import { authenticateApi, clampInt, json } from "@/lib/api/auth";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/agent/history — posts (all review states except rejected)
 * with keyword coverage, newest first. Query: limit (≤100, default 30),
 * offset, since (ISO date), status=published|needs_review|approved|draft.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:read"]);
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const limit = clampInt(url.searchParams.get("limit"), 1, 100, 30);
  const offset = clampInt(url.searchParams.get("offset"), 0, 1e9, 0);
  const since = url.searchParams.get("since");
  const status = url.searchParams.get("status");

  const supabase = getServiceSupabase();
  let q = supabase
    .from("blog_posts")
    .select(
      "id, slug, title, primary_keyword, secondary_keywords, tags, practice_area_ids, related_county_ids, review_status, is_published, published_at, word_count, created_via, topic_id, created_at, updated_at",
      { count: "exact" },
    )
    .neq("review_status", "rejected")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (since && !Number.isNaN(Date.parse(since))) q = q.gte("created_at", new Date(since).toISOString());
  if (status) q = q.eq("review_status", status);
  const [{ data, error, count }, { data: cov }] = await Promise.all([
    q,
    supabase
      .from("blog_posts")
      .select("primary_keyword, slug")
      .neq("review_status", "rejected")
      .not("primary_keyword", "is", null)
      .limit(1000),
  ]);
  if (error) return json(500, { error: error.message });
  return json(200, {
    posts: ((data ?? []) as Array<Record<string, unknown>>).map((p) => ({ ...p, url: `/blog/${p.slug as string}` })),
    keyword_coverage: ((cov ?? []) as Array<{ primary_keyword: string; slug: string }>).map((r) => ({
      keyword: r.primary_keyword,
      slug: r.slug,
    })),
    count: count ?? 0,
    limit,
    offset,
  });
}
