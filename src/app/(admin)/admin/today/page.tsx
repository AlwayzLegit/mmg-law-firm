import Link from "next/link";
import { CalendarClock, Inbox, ListTodo, Timer } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { channelOf } from "@/lib/analytics/attribution";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatMinutes, getResponseTimeStats } from "@/lib/data/lead-analytics";
import {
  SLA_TARGET_MINUTES,
  SLA_WARN_MINUTES,
  ageMinutes,
  formatAge,
  slaTone,
  type SlaTone,
} from "@/lib/leads/sla";
import { getServerSupabase } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

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

function relName(rel: unknown): string | null {
  if (!rel) return null;
  const obj = Array.isArray(rel) ? rel[0] : rel;
  return (obj as { name?: string } | null)?.name ?? null;
}

const TONE_CLASS: Record<SlaTone, string> = {
  ok: "bg-success/10 text-success",
  warn: "bg-warning/10 text-warning",
  breach: "bg-destructive/10 text-destructive",
};

export default async function TodayPage() {
  await requireAdmin();
  const supabase = await getServerSupabase();
  // Server component rendered per request (force-dynamic): the clock is read
  // once so every age on the page agrees.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

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

  // Speed-to-lead: every lead still in "new" is waiting for a first call,
  // whoever it is assigned to. Oldest first so the worst breach is on top.
  const [{ data: waitingRows }, responseStats] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, full_name, created_at, assigned_to, utm_source, utm_medium, gclid, referrer, practice_areas(name)",
      )
      .eq("status", "new")
      .order("created_at", { ascending: true })
      .limit(50),
    getResponseTimeStats(supabase, 30),
  ]);
  const waiting = (waitingRows ?? []).map((l) => {
    const minutes = ageMinutes(l.created_at as string, now);
    return {
      id: l.id as string,
      name: l.full_name as string,
      minutes,
      tone: slaTone(minutes),
      channel: channelOf({
        utm_source: l.utm_source as string | null,
        utm_medium: l.utm_medium as string | null,
        gclid: l.gclid as string | null,
        referrer: l.referrer as string | null,
      }),
      practiceArea: relName(l.practice_areas),
      assignee: l.assigned_to
        ? (labelOf.get(l.assigned_to as string) ?? "Assigned")
        : null,
    };
  });
  const breaches = waiting.filter((l) => l.tone === "breach").length;
  const oldest = waiting[0];

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
        {waiting.length === 0
          ? "No new leads waiting for a first call."
          : `${waiting.length} lead${waiting.length === 1 ? "" : "s"} waiting for a first call${
              breaches ? ` · ${breaches} over an hour` : ""
            }${oldest ? ` · oldest ${formatAge(oldest.minutes)}` : ""}.`}{" "}
        {openCount === 0
          ? "No open tasks."
          : `${openCount} open task${openCount === 1 ? "" : "s"}${
              overdue.length ? ` · ${overdue.length} overdue` : ""
            }.`}
      </p>

      {/* Speed to lead */}
      <Card
        className={cn(
          "mt-6",
          breaches > 0 && "border-destructive/40 bg-destructive/5",
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="h-4 w-4 text-primary" aria-hidden />
            Needs first response ({waiting.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label={`Within ${SLA_TARGET_MINUTES} min`}
              value={
                responseStats.within15mPct === null
                  ? "—"
                  : `${responseStats.within15mPct}%`
              }
              hint="last 30 days"
            />
            <Stat
              label="Within 1 hour"
              value={
                responseStats.within1hPct === null
                  ? "—"
                  : `${responseStats.within1hPct}%`
              }
              hint="last 30 days"
            />
            <Stat
              label="Median response"
              value={
                responseStats.medianMinutes === null
                  ? "—"
                  : formatMinutes(responseStats.medianMinutes)
              }
              hint={`${responseStats.sample} leads`}
            />
            <Stat
              label="Over 1 hour now"
              value={String(breaches)}
              tone={breaches > 0 ? "breach" : "ok"}
            />
          </dl>
          {waiting.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every new lead has been answered. Target: first call within{" "}
              {SLA_TARGET_MINUTES} minutes.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {waiting.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/leads/${l.id}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {l.name}
                    </Link>
                    <p className="text-muted-foreground truncate text-xs">
                      {[l.practiceArea, l.channel, l.assignee && `→ ${l.assignee}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "flex-none rounded-sm px-2 py-0.5 font-mono text-xs font-medium tabular-nums",
                      TONE_CLASS[l.tone],
                    )}
                    title={
                      l.tone === "breach"
                        ? `Waiting more than ${SLA_WARN_MINUTES} minutes`
                        : l.tone === "warn"
                          ? `Past the ${SLA_TARGET_MINUTES}-minute target`
                          : "Within target"
                    }
                  >
                    {formatAge(l.minutes)}
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

      <p className="text-muted-foreground mt-6 flex items-center gap-2 text-xs">
        <Inbox className="h-3.5 w-3.5" aria-hidden />
        A lead leaves “Needs first response” when its status changes, a note
        is added, it is assigned, or a conflict check is logged.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: SlaTone;
}) {
  return (
    <div className="bg-background rounded-md border border-border px-3 py-2">
      <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "font-display mt-0.5 text-xl tabular-nums",
          tone === "breach" && "text-destructive",
        )}
      >
        {value}
      </dd>
      {hint ? (
        <dd className="text-muted-foreground text-[11px]">{hint}</dd>
      ) : null}
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
