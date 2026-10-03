import "server-only";

import { authenticateApi, clampInt, json } from "@/lib/api/auth";
import { loadBrief } from "@/lib/content-agent/brief";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INCLUDES = ["site_urls", "history", "seo_issues", "answers"] as const;
type Include = (typeof INCLUDES)[number];

/**
 * GET /api/admin/agent/brief — read-only brief for dry runs and debugging.
 * Does NOT start a run, claim topics, or mark answers delivered; use
 * POST /api/admin/agent/runs for a real run.
 *
 * Query: urls_limit (1–1000, default 200), history_limit (1–100, default 30),
 * include=site_urls,history,seo_issues,answers (default all).
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:read"]);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const includeParam = url.searchParams.get("include");
  const include = new Set<Include>(
    includeParam
      ? (includeParam.split(",").map((s) => s.trim()).filter((s): s is Include => (INCLUDES as readonly string[]).includes(s)))
      : INCLUDES,
  );

  const supabase = getServiceSupabase();
  const brief = await loadBrief(supabase, {
    principal: auth.principal,
    urlsLimit: clampInt(url.searchParams.get("urls_limit"), 1, 1000, 200),
    historyLimit: clampInt(url.searchParams.get("history_limit"), 1, 100, 30),
    include,
  });
  return json(200, { brief });
}
