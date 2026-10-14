import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

/** Human labels for the audit actions content editors emit. */
const ACTION_LABEL: Record<string, string> = {
  create: "Created",
  approve: "Approved",
  reject: "Rejected",
  reopen_review: "Reopened for review",
  start: "Run started",
  run_progress: "Run progress",
  run_succeeded: "Run succeeded",
  run_failed: "Run failed",
  run_needs_human: "Run needs a decision",
  topics_added: "Topics added",
  answered: "Question answered",
  dismissed: "Question dismissed",
  edit: "Edited",
  publish: "Published",
  unpublish: "Unpublished",
  bulk_publish: "Published (bulk)",
  bulk_unpublish: "Unpublished (bulk)",
  touch_reviewed: "Marked reviewed",
  update: "Updated",
  delete: "Deleted",
};

/**
 * Who did it: a named admin, a named API key (`diff.api_key_name`, written by
 * the admin API), the legacy shared API key, or "System".
 */
export function actorLabel(
  actorId: string | null,
  diff: Record<string, unknown> | null,
  nameOf: Map<string, string>,
): string {
  if (actorId) return nameOf.get(actorId) ?? "An admin";
  const keyName = diff?.api_key_name;
  if (typeof keyName === "string" && keyName) return `API key “${keyName}”`;
  if (diff?.via === "admin_api") return "Admin API";
  return "System";
}

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/**
 * Change-history panel for a content record. Reads the audit_log trail for one
 * (entity, entity_id) and shows who changed what, when. Drop it onto any
 * content editor page: <ContentHistory entity="location_pages" entityId={id} />
 */
export default async function ContentHistory({
  entity,
  entityId,
  limit = 25,
}: {
  entity: string;
  entityId: string;
  limit?: number;
}) {
  const supabase = await getServerSupabase();
  const [{ data: rows }, { data: admins }] = await Promise.all([
    supabase
      .from("audit_log")
      .select("id, actor_id, action, diff, ts")
      .eq("entity", entity)
      .eq("entity_id", entityId)
      .order("ts", { ascending: false })
      .limit(limit),
    supabase.from("admin_profiles").select("user_id, full_name"),
  ]);

  const nameOf = new Map(
    (admins ?? []).map((a) => [
      a.user_id as string,
      (a.full_name as string | null) ?? "An admin",
    ]),
  );
  const events = rows ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">History</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">No changes recorded yet.</p>
        ) : (
          <ul className="divide-border divide-y text-sm">
            {events.map((e) => (
              <li
                key={e.id as string}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="min-w-0">
                  <span className="font-medium">
                    {ACTION_LABEL[e.action as string] ?? (e.action as string)}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    by{" "}
                    {actorLabel(
                      e.actor_id as string | null,
                      e.diff as Record<string, unknown> | null,
                      nameOf,
                    )}
                  </span>
                </span>
                <time
                  className="text-muted-foreground flex-none text-xs"
                  dateTime={e.ts as string}
                  title={new Date(e.ts as string).toLocaleString("en-US")}
                >
                  {timeAgo(e.ts as string)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
