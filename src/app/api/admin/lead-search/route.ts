import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Strip PostgREST `.or()` / `ilike` metacharacters from a search term. */
function sanitize(q: string): string {
  return q
    .replace(/[%_,()]/g, " ")
    .trim()
    .slice(0, 80);
}

/**
 * GET /api/admin/lead-search?q= — typeahead for the command palette.
 * Returns up to 6 matching leads (name / phone / email), spam excluded.
 * Admin-gated; never includes the free-text description.
 */
export async function GET(req: Request): Promise<Response> {
  await requireAdmin();

  const q = sanitize(new URL(req.url).searchParams.get("q") ?? "");
  if (q.length < 2) {
    return NextResponse.json({ leads: [] });
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("leads")
    .select("id, full_name, phone, status, created_at")
    .neq("status", "spam")
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    return NextResponse.json({ leads: [], error: error.message });
  }

  return NextResponse.json({ leads: data ?? [] });
}
