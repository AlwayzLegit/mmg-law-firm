import Link from "next/link";
import { Download, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import LeadsTable, { type LeadRow } from "./leads-table";

const STATUS_OPTIONS = [
  "all",
  "new",
  "contacted",
  "qualified",
  "signed",
  "rejected",
  "spam",
] as const;

const CLOSED = ["signed", "rejected", "spam"];

type SearchParams = { status?: string; q?: string; due?: string };

/** Strip PostgREST `.or()` / `ilike` metacharacters from a search term. */
function sanitize(q: string): string {
  return q.replace(/[%_,()]/g, " ").trim().slice(0, 80);
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = STATUS_OPTIONS.includes(
    (params.status ?? "all") as (typeof STATUS_OPTIONS)[number],
  )
    ? (params.status ?? "all")
    : "all";
  const due = params.due === "1";
  const rawQ = (params.q ?? "").trim();
  const q = sanitize(rawQ);

  const supabase = await getServerSupabase();

  let query = supabase
    .from("leads")
    .select("id, full_name, phone, email, status, created_at, follow_up_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (due) {
    query = query
      .not("follow_up_at", "is", null)
      .lte("follow_up_at", new Date().toISOString())
      .not("status", "in", `(${CLOSED.join(",")})`)
      .order("follow_up_at", { ascending: true });
  } else if (status !== "all") {
    query = query.eq("status", status);
  } else {
    // Default view excludes spam — explicit filter shows them.
    query = query.neq("status", "spam");
  }

  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;
  const rows = (data ?? []) as LeadRow[];

  // Preserve the active filters in the export link.
  const exportParams = new URLSearchParams();
  if (due) exportParams.set("due", "1");
  else if (status !== "all") exportParams.set("status", status);
  if (rawQ) exportParams.set("q", rawQ);
  const exportHref = `/admin/leads/export${exportParams.toString() ? `?${exportParams}` : ""}`;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Leads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {due
              ? "Follow-ups that are due or overdue, soonest first."
              : "Most recent first. Click any name for details. Tick rows for bulk actions."}
            {!due && status === "all"
              ? " Spam is hidden — pick the spam filter to review."
              : null}
          </p>
        </div>
        <a
          href={exportHref}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Export CSV
        </a>
      </div>

      <form method="get" className="mt-6 flex max-w-md items-center gap-2">
        {due ? <input type="hidden" name="due" value="1" /> : null}
        {!due && status !== "all" ? (
          <input type="hidden" name="status" value={status} />
        ) : null}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={rawQ}
            placeholder="Search name, email, or phone"
            aria-label="Search leads"
            className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
        {rawQ ? (
          <Link
            href={due ? "/admin/leads?due=1" : `/admin/leads?status=${status}`}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filter by status">
        {STATUS_OPTIONS.map((s) => {
          const active = !due && status === s;
          return (
            <Link
              key={s}
              href={`/admin/leads${s === "all" ? "" : `?status=${s}`}`}
              className={`rounded-md border border-border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "hover:bg-secondary"
              }`}
            >
              {s}
            </Link>
          );
        })}
        <Link
          href="/admin/leads?due=1"
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
            due
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border hover:bg-secondary"
          }`}
        >
          Follow-ups due
        </Link>
      </nav>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            {rows.length} matching {rows.length === 1 ? "lead" : "leads"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : (
            <LeadsTable rows={rows} status={status} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
