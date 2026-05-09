import Link from "next/link";

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

type SearchParams = { status?: string };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = STATUS_OPTIONS.includes(
    (params.status ?? "all") as (typeof STATUS_OPTIONS)[number],
  )
    ? params.status ?? "all"
    : "all";

  const supabase = await getServerSupabase();

  let query = supabase
    .from("leads")
    .select("id, full_name, phone, email, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    query = query.eq("status", status);
  } else {
    // Default view excludes spam — explicit filter shows them.
    query = query.neq("status", "spam");
  }

  const { data, error } = await query;
  const rows = (data ?? []) as LeadRow[];

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Leads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Most recent first. Click any name for details. Tick rows for bulk
            actions.
            {status === "all"
              ? " Spam is hidden — pick the spam filter to review."
              : null}
          </p>
        </div>
      </div>

      <nav
        className="mt-6 flex flex-wrap gap-2"
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map((s) => (
          <Link
            key={s}
            href={`/admin/leads${s === "all" ? "" : `?status=${s}`}`}
            className={`rounded-md border border-border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              status === s
                ? "border-primary/40 bg-primary/10 text-primary"
                : "hover:bg-secondary"
            }`}
          >
            {s}
          </Link>
        ))}
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
