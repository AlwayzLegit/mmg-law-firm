import Link from "next/link";
import { CalendarClock, Inbox, ListTodo } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Open tasks, with their lead's name.
  const { data: taskRows } = await supabase
    .from("tasks")
    .select("id, title, due_at, done, lead_id, assigned_to, leads(full_name)")
    .eq("done", false)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(200);

  const tasks: TaskItem[] = (taskRows ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    dueAt: (t.due_at as string | null) ?? null,
    done: false,
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
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Today
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {openCount === 0
          ? "No open tasks. Add one below or work your due follow-ups."
          : `${openCount} open task${openCount === 1 ? "" : "s"}${
              overdue.length ? ` · ${overdue.length} overdue` : ""
            }.`}
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4 text-primary" aria-hidden />
            Add a task
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AddTaskForm />
        </CardContent>
      </Card>

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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
            Follow-ups due ({followUps.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {followUps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No follow-ups due. Nice.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {followUps.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
                >
                  <Link
                    href={`/admin/leads/${l.id}`}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {l.full_name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
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
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4 text-primary" aria-hidden />
            New &amp; unassigned ({newLeads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {newLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No unassigned intake. Inbox zero.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {newLeads.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
                >
                  <Link
                    href={`/admin/leads/${l.id}`}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {l.full_name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {new Date(l.created_at as string).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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
    <Card
      className={
        tone === "destructive" ? "mt-6 border-destructive/40 bg-destructive/5" : "mt-6"
      }
    >
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
