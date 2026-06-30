import "server-only";

import { authorizeAdminApi, json } from "@/lib/api/auth";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/taxonomy — practice areas + counties as { id, slug, name }.
 * Lets an external tool (n8n, Cowork) resolve names to the UUIDs that a blog
 * post's `practice_area_ids` / `related_county_ids` expect.
 */
export async function GET(req: Request): Promise<Response> {
  const denied = authorizeAdminApi(req);
  if (denied) return denied;

  const supabase = getServiceSupabase();
  const [pa, co] = await Promise.all([
    supabase
      .from("practice_areas")
      .select("id, slug, name")
      .order("display_order", { ascending: true }),
    supabase.from("counties").select("id, slug, name").order("name"),
  ]);

  if (pa.error) return json(500, { error: pa.error.message });
  if (co.error) return json(500, { error: co.error.message });

  return json(200, {
    practice_areas: pa.data ?? [],
    counties: co.data ?? [],
  });
}
