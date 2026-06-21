import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type AuditRow = {
  id: string;
  actor_id: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  diff: Record<string, unknown> | null;
  ts: string;
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { profile } = await requireAdmin();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  if (profile.role !== "owner") {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Audit log
        </h1>
        <Card className="mt-6">
          <CardContent className="text-muted-foreground py-8 text-sm">
            The audit log is visible to firm owners only.
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await getServerSupabase();
  const { data, error, count } = await supabase
    .from("audit_log")
    .select("id, actor_id, entity, entity_id, action, diff, ts", {
      count: "exact",
    })
    .order("ts", { ascending: false })
    .range(from, to);
  const rows = (data ?? []) as AuditRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Resolve actor names in one query.
  const actorIds = [
    ...new Set(rows.map((r) => r.actor_id).filter(Boolean)),
  ] as string[];
  let names: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: admins } = await supabase
      .from("admin_profiles")
      .select("user_id, full_name")
      .in("user_id", actorIds);
    names = Object.fromEntries(
      (admins ?? []).map((a) => [a.user_id, a.full_name ?? "Admin"]),
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Audit log
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Admin actions, most recent first. Includes API and system events.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            {total} {total === 1 ? "entry" : "entries"}
            {totalPages > 1 ? (
              <span className="text-muted-foreground ml-2 text-xs font-normal">
                · page {page} of {totalPages}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-border text-muted-foreground border-b text-xs tracking-wide uppercase">
                  <tr>
                    <th className="px-2 py-3 text-left">When</th>
                    <th className="px-2 py-3 text-left">Actor</th>
                    <th className="px-2 py-3 text-left">Entity</th>
                    <th className="px-2 py-3 text-left">Action</th>
                    <th className="px-2 py-3 text-left">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-border/60 border-b">
                      <td className="text-muted-foreground px-2 py-3 align-top text-xs whitespace-nowrap">
                        <time dateTime={r.ts}>
                          {new Date(r.ts).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </time>
                      </td>
                      <td className="px-2 py-3 align-top">
                        {r.actor_id
                          ? (names[r.actor_id] ?? "Admin")
                          : "System / API"}
                      </td>
                      <td className="text-muted-foreground px-2 py-3 align-top">
                        {r.entity}
                      </td>
                      <td className="px-2 py-3 align-top">
                        <span className="bg-secondary rounded-md px-2 py-0.5 text-xs font-medium">
                          {r.action}
                        </span>
                      </td>
                      <td className="text-muted-foreground max-w-[28rem] px-2 py-3 align-top text-xs">
                        {r.diff ? (
                          <code className="break-words">
                            {JSON.stringify(r.diff)}
                          </code>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 ? (
            <nav
              className="border-border mt-6 flex items-center justify-between gap-3 border-t pt-4"
              aria-label="Pagination"
            >
              {page > 1 ? (
                <Link
                  href={`/admin/audit?page=${page - 1}`}
                  rel="prev"
                  className="border-border hover:bg-secondary inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  Previous
                </Link>
              ) : (
                <span aria-hidden />
              )}
              <span className="text-muted-foreground text-xs">
                Showing {from + 1}–{Math.min(to + 1, total)} of {total}
              </span>
              {page < totalPages ? (
                <Link
                  href={`/admin/audit?page=${page + 1}`}
                  rel="next"
                  className="border-border hover:bg-secondary inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              ) : (
                <span aria-hidden />
              )}
            </nav>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
