import { AdminPageHeader, Avatar, EmptyNote, GridHead, GridRow, Pager, Panel, adminCode } from "@/components/admin/ui";
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

const COLS = "md:grid-cols-[120px_minmax(150px,1fr)_120px_130px_minmax(0,2fr)]";

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
        <AdminPageHeader eyebrow="Security" title="Audit log" />
        <Panel className="mt-6">
          <EmptyNote>The audit log is visible to firm owners only.</EmptyNote>
        </Panel>
      </div>
    );
  }

  const supabase = await getServerSupabase();
  const { data, error, count } = await supabase
    .from("audit_log")
    .select("id, actor_id, entity, entity_id, action, diff, ts", { count: "exact" })
    .order("ts", { ascending: false })
    .range(from, to);
  const rows = (data ?? []) as AuditRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Resolve actor names in one query.
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
  let names: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: admins } = await supabase.from("admin_profiles").select("user_id, full_name").in("user_id", actorIds);
    names = Object.fromEntries((admins ?? []).map((a) => [a.user_id, a.full_name ?? "Admin"]));
  }

  const actorOf = (r: AuditRow) => {
    if (r.actor_id) return { name: names[r.actor_id] ?? "Admin", kind: "admin" as const };
    const keyName = r.diff?.api_key_name;
    if (typeof keyName === "string" && keyName) return { name: `API key “${keyName}”`, kind: "api" as const };
    if (r.diff?.via === "admin_api") return { name: "Admin API", kind: "api" as const };
    return { name: "System", kind: "system" as const };
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Security"
        title="Audit log"
        description="Admin actions, most recent first. Includes API and system events."
      />

      <Panel
        className="mt-6"
        title={`${total} ${total === 1 ? "entry" : "entries"}`}
        action={totalPages > 1 ? <span className="text-stone text-xs">page {page} of {totalPages}</span> : null}
      >
        {error ? (
          <p className="text-[13px] text-[#b91c1c]">{error.message}</p>
        ) : rows.length === 0 ? (
          <EmptyNote>No activity yet.</EmptyNote>
        ) : (
          <div className="-mx-4">
            <GridHead cols={COLS}>
              <span>When</span>
              <span>Actor</span>
              <span>Entity</span>
              <span>Action</span>
              <span>Detail</span>
            </GridHead>
            {rows.map((r) => {
              const actor = actorOf(r);
              return (
                <GridRow key={r.id} cols={COLS} className="items-start">
                  <time dateTime={r.ts} className="text-stone text-xs whitespace-nowrap">
                    {new Date(r.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </time>
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={actor.kind === "admin" ? actor.name : actor.kind === "api" ? "A P" : "S Y"} size={24} tone={actor.kind === "admin" ? "ink" : actor.kind === "api" ? "gold" : "muted"} />
                    <span className="min-w-0 truncate font-semibold">{actor.name}</span>
                  </span>
                  <span className="text-stone">{r.entity}</span>
                  <span>
                    <code className={adminCode}>{r.action}</code>
                  </span>
                  <span className="text-stone min-w-0 text-xs">
                    {r.diff ? <code className="font-mono break-all text-[11px]">{JSON.stringify(r.diff)}</code> : "—"}
                  </span>
                </GridRow>
              );
            })}
          </div>
        )}

        <Pager page={page} totalPages={totalPages} from={from} to={to} total={total} hrefFor={(p) => `/admin/audit?page=${p}`} />
      </Panel>
    </div>
  );
}
