import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type Severity = "high" | "medium" | "low";

export type ContentIssue = {
  entity: string;
  entityId: string;
  label: string;
  issue: string;
  severity: Severity;
  editHref: string;
};

export type ContentHealth = {
  issues: ContentIssue[];
  counts: { high: number; medium: number; low: number; total: number };
  /** Published-row totals per content type, for context. */
  published: {
    locationPages: number;
    counties: number;
    practiceAreas: number;
    blog: number;
  };
};

const EDIT_BASE: Record<string, string> = {
  location_page: "/admin/content/location-pages/",
  county: "/admin/content/counties/",
  practice_area: "/admin/content/practice-areas/",
  blog: "/admin/content/blog/",
};

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

type RpcRow = {
  entity: string;
  entity_id: string;
  label: string;
  issue: string;
  severity: string;
};

/**
 * Content-health report for the SEO command center: every published-page SEO
 * problem (missing/over-length meta, thin copy, draft missing a local angle,
 * overdue review) plus published-row totals for context. Reads from the
 * `content_health_issues()` RPC (admin-guarded, SQL length() checks).
 */
export async function getContentHealth(
  supabase: SupabaseClient,
): Promise<ContentHealth> {
  const [{ data: rpcData }, lp, co, pa, bl] = await Promise.all([
    supabase.rpc("content_health_issues"),
    supabase
      .from("location_pages")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),
    supabase
      .from("counties")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),
    supabase
      .from("practice_areas")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),
    supabase
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),
  ]);

  const issues: ContentIssue[] = ((rpcData ?? []) as RpcRow[])
    .map((r) => ({
      entity: r.entity,
      entityId: r.entity_id,
      label: r.label,
      issue: r.issue,
      severity: (["high", "medium", "low"].includes(r.severity)
        ? r.severity
        : "low") as Severity,
      editHref: (EDIT_BASE[r.entity] ?? "/admin/content/") + r.entity_id,
    }))
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        a.entity.localeCompare(b.entity),
    );

  const counts = {
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
    low: issues.filter((i) => i.severity === "low").length,
    total: issues.length,
  };

  return {
    issues,
    counts,
    published: {
      locationPages: lp.count ?? 0,
      counties: co.count ?? 0,
      practiceAreas: pa.count ?? 0,
      blog: bl.count ?? 0,
    },
  };
}
