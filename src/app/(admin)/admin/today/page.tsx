import Link from "next/link";
import { CalendarClock, Inbox, ListTodo } from "lucide-react";

import { AdminPageHeader, EmptyNote, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

import { TaskList, AddTaskForm, type TaskItem } from "../tasks/task-ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Today" };

const CLOSED = ["signed", "rejected", "spam"];

/** The embedded `leads(full_name)` relation can type as an object or array
 *  depending on the generated types — read the name out of either shape. */
function leadFullName(rel: unknown): string | null {
  if (!rel) return null;
  const obj = Array.isArray(rel) ? rel[0] : rel;
  return (obj as { full_name?: string } | null)?.full_name ?? null;
}

export default async function TodayPage() {
  await requireAdmin();
  const supabase = await getServerSupabase();

  // Admin display labels for assignees.
  const { data: adminRows } = await supabase
    .from("admin_profiles")
    .select("user_id, full_name, role");
  const labelOf = new Map(
    (adminRows ?? []).map((a) => [
      a.user_id as string,
      (a.full_name as string | null) ?? (a.role as string),
    ]),
  );

  // Open tasks + tasks completed today, so the moment-of-completion strike-
  // through stays visible until tomorrow instead of vanishing on toggle.
  const sinceTodayIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const { data: taskRows } = await supabase
    .from("tasks")
    .select(
      "id, title, due_at, done, done_at, lead_id, assigned_to, leads(full_name)",
    )
    .or(`done.eq.false,done_at.gte.${sinceTodayIso}`)
    .order("done", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(200);

  const tasks: TaskItem[] = (taskRows ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    dueAt: (t.due_at as string | null) ?? null,
    done: Boolean(t.done),
    leadId: (t.lead_id as string | null) ?? null,
    leadName: leadFullName(t.leads),
    assigneeLabel: t.assigned_to
      ? (labelOf.get(t.assigned_to as string) ?? null)
      : null,
  }));

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date();
  endToday.setHours(23, 59, 59, 999);
  const startMs = startToday.getTime();
  const endMs = endToday.getTime();

  const overdue = tasks.filter(
    (t) => t.dueAt && new Date(t.dueAt).getTime() < startMs,
  );
  const todayTasks = tasks.filter((t) => {
    if (!t.dueAt) return false;
    const ms = new Date(t.dueAt).getTime();
    return ms >= startMs && ms <= endMs;
  });
  const upcoming = tasks.filter(
    (t) => t.dueAt && new Date(t.dueAt).getTime() > endMs,
  );
  const noDate = tasks.filter((t) => !t.dueAt);

  // Follow-ups due now or overdue (the single-reminder field on leads).
  const { data: dueRows } = await supabase
    .from("leads")
    .select("id, full_name, follow_up_at, status")
    .not("follow_up_at", "is", null)
    .lte("follow_up_at", new Date().toISOString())
    .not("status", "in", `(${CLOSED.join(",")})`)
    .order("follow_up_at", { ascending: true })
    .limit(50);
  const followUps = dueRows ?? [];

  // New, still-unassigned leads — the intake that needs a first touch.
  const { data: newRows } = await supabase
    .from("leads")
    .select("id, full_name, created_at")
    .eq("status", "new")
    .is("assigned_to", null)
    .order("created_at", { ascending: false })
    .limit(50);
  const newLeads = newRows ?? [];

  const openCount = tasks.length;

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        eyebrow={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        title="Today"
        description={
          openCount === 0
            ? "No open tasks. Add one below or work your due follow-ups."
            : `${openCount} open task${openCount === 1 ? "" : "s"}${overdue.length ? ` · ${overdue.length} overdue` : ""}.`
        }
      />

      <Panel
        className="mt-6"
        title={
          <span className="inline-flex items-center gap-2">
            <ListTodo className="text-gold-deep h-4 w-4" aria-hidden />
            Add a task
          </span>
        }
      >
        <AddTaskForm />
      </Panel>

      {overdue.length > 0 ? (
        <Section title={`Overdue (${overdue.length})`} tone="destructive">
          <TaskList tasks={overdue} />
        </Section>
      ) : null}

      <Section title="Due today">
        <TaskList tasks={todayTasks} emptyText="Nothing due today." />
      </Section>

      {upcoming.length > 0 ? (
        <Section title={`Upcoming (${upcoming.length})`}>
          <TaskList tasks={upcoming} />
        </Section>
      ) : null}

      {noDate.length > 0 ? (
        <Section title={`No due date (${noDate.length})`}>
          <TaskList tasks={noDate} />
        </Section>
      ) : null}

      <Panel
        className="mt-6"
        title={
          <span className="inline-flex items-center gap-2">
            <CalendarClock className="text-gold-deep h-4 w-4" aria-hidden />
            Follow-ups due ({followUps.length})
          </span>
        }
      >
        {followUps.length === 0 ? (
            <EmptyNote>No follow-ups due. Nice.</EmptyNote>
          ) : (
            <ul className="divide-line m-0 list-none divide-y p-0">
              {followUps.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
                >
                  <Link
                    href={`/admin/leads/${l.id}`}
                    className="text-foreground hover:text-gold-deep text-[13px] font-semibold no-underline"
                  >
                    {l.full_name}
                  </Link>
                  <span className="text-stone text-xs">
                    {new Date(l.follow_up_at as string).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
      </Panel>

      <Panel
        className="mt-6"
        title={
          <span className="inline-flex items-center gap-2">
            <Inbox className="text-gold-deep h-4 w-4" aria-hidden />
            New &amp; unassigned ({newLeads.length})
          </span>
        }
      >
        {newLeads.length === 0 ? (
            <EmptyNote>No unassigned intake. Inbox zero.</EmptyNote>
          ) : (
            <ul className="divide-line m-0 list-none divide-y p-0">
              {newLeads.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
                >
                  <Link
                    href={`/admin/leads/${l.id}`}
                    className="text-foreground hover:text-gold-deep text-[13px] font-semibold no-underline"
                  >
                    {l.full_name}
                  </Link>
                  <span className="text-stone text-xs">
                    {new Date(l.created_at as string).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
      </Panel>
    </div>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "destructive";
  children: React.ReactNode;
}) {
  return (
    <Panel
      className={tone === "destructive" ? "mt-6 ring-[#dc2626]/30" : "mt-6"}
      title={<span className={tone === "destructive" ? "text-[#b91c1c]" : undefined}>{title}</span>}
    >
      {children}
    </Panel>
  );
}
