import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

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
    .select(
      "id, full_name, phone, email, status, created_at, county_id, practice_area_id",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Leads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Most recent first. Click any name for details.
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
            {data?.length ?? 0} matching {data?.length === 1 ? "lead" : "leads"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-3 text-left">Created</th>
                    <th className="px-2 py-3 text-left">Name</th>
                    <th className="px-2 py-3 text-left">Phone</th>
                    <th className="px-2 py-3 text-left">Email</th>
                    <th className="px-2 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((l) => (
                    <tr key={l.id} className="border-b border-border/60">
                      <td className="px-2 py-3 align-top text-xs text-muted-foreground">
                        <time dateTime={l.created_at}>
                          {new Date(l.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </time>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <Link
                          href={`/admin/leads/${l.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {l.full_name}
                        </Link>
                      </td>
                      <td className="px-2 py-3 align-top text-xs text-muted-foreground">
                        {l.phone}
                      </td>
                      <td className="px-2 py-3 align-top text-xs text-muted-foreground">
                        {l.email ?? "—"}
                      </td>
                      <td className="px-2 py-3 align-top">
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium capitalize">
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TODO(group-e): kanban view toggle, bulk actions, filters by county
          and practice area. Inline status changes from the row. */}
    </div>
  );
}
