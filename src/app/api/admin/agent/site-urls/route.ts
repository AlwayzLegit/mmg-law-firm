import "server-only";

import { authenticateApi, clampInt, json } from "@/lib/api/auth";
import { buildSiteUrls } from "@/lib/content-agent/site-urls";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/agent/site-urls — internal-link inventory. Query: limit (≤1000), offset. */
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:read"]);
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const site_urls = await buildSiteUrls(getServiceSupabase(), {
    limit: clampInt(url.searchParams.get("limit"), 1, 1000, 500),
    offset: clampInt(url.searchParams.get("offset"), 0, 1e9, 0),
  });
  return json(200, { site_urls });
}
