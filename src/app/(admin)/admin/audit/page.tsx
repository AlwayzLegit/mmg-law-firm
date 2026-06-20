import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: string;
  actor_id: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  diff: Record<string, unknown> | null;
  ts: string;
};

export default async function AuditLogPage() {
  const { profile } = await requireAdmin();

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
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, actor_id, entity, entity_id, action, diff, ts")
    .order("ts", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as AuditRow[];

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
        The 100 most recent admin actions. Includes API and system events.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
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
        </CardContent>
      </Card>
    </div>
  );
}
