import "server-only";

import { authenticateApi, json } from "@/lib/api/auth";
import { buildOpenApi } from "@/lib/api/openapi";
import { siteUrl } from "@/lib/seo/canonical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/openapi.json — OpenAPI 3.1 for any valid key. */
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, []);
  if (!auth.ok) return auth.response;
  return json(200, buildOpenApi(siteUrl()), { "cache-control": "private, max-age=300" });
}
