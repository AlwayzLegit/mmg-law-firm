import { requireAdmin } from "@/lib/auth/require-admin";
import { logAudit } from "@/lib/audit";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = new Set([
  "new",
  "contacted",
  "qualified",
  "signed",
  "rejected",
  "spam",
]);
const CLOSED = ["signed", "rejected", "spam"];

const COLUMNS = [
  "created_at",
  "full_name",
  "phone",
  "email",
  "status",
  "preferred_contact",
  "incident_date",
  "injured",
  "has_attorney",
  "follow_up_at",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "source_url",
  "referrer",
  "description",
] as const;

/** Strip PostgREST `.or()` / `ilike` metacharacters from a search term. */
function sanitize(q: string): string {
  return q
    .replace(/[%_,()]/g, " ")
    .trim()
    .slice(0, 80);
}

function csvCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** GET /admin/leads/export?status=&q=&due= — CSV of the filtered leads. */
export async function GET(req: Request): Promise<Response> {
  const { user } = await requireAdmin();

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "all";
  const q = sanitize(url.searchParams.get("q") ?? "");
  const due = url.searchParams.get("due") === "1";
  const source = sanitize(url.searchParams.get("source") ?? "");
  const paSlug = sanitize(url.searchParams.get("pa") ?? "");
  const countySlug = sanitize(url.searchParams.get("county") ?? "");
  const assignee = url.searchParams.get("assignee") ?? "all";

  const supabase = await getServerSupabase();

  // Resolve drill-down slugs to FK ids so the export matches the on-screen
  // filtered view.
  let paId: string | null = null;
  if (paSlug) {
    const { data } = await supabase
      .from("practice_areas")
      .select("id")
      .eq("slug", paSlug)
      .maybeSingle();
    paId = data?.id ?? null;
  }
  let countyId: string | null = null;
  if (countySlug) {
    const { data } = await supabase
      .from("counties")
      .select("id")
      .eq("slug", countySlug)
      .maybeSingle();
    countyId = data?.id ?? null;
  }

  let query = supabase
    .from("leads")
    .select(COLUMNS.join(","))
    .order("created_at", { ascending: false })
    .limit(5000);

  if (due) {
    query = query
      .not("follow_up_at", "is", null)
      .lte("follow_up_at", new Date().toISOString())
      .not("status", "in", `(${CLOSED.join(",")})`);
  } else if (status !== "all" && STATUSES.has(status)) {
    query = query.eq("status", status);
  } else if (status === "all") {
    query = query.neq("status", "spam");
  }

  if (source) query = query.eq("utm_source", source);
  if (paId) query = query.eq("practice_area_id", paId);
  if (countyId) query = query.eq("county_id", countyId);
  if (assignee === "me") query = query.eq("assigned_to", user.id);
  else if (assignee === "unassigned") query = query.is("assigned_to", null);

  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    return new Response(`Export failed: ${error.message}`, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const header = COLUMNS.join(",");
  const body = rows
    .map((row) => COLUMNS.map((c) => csvCell(row[c])).join(","))
    .join("\r\n");
  const csv = `${header}\r\n${body}\r\n`;

  logAudit({
    actor_id: user.id,
    entity: "leads",
    entity_id: null,
    action: "export_csv",
    diff: { rows: rows.length, status, due, q: q || undefined },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leads-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
