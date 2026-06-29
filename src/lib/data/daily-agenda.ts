import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AgendaTask = { title: string; dueAt: string | null; leadId: string | null };
export type AgendaLead = { id: string; firstName: string; at: string };

export type DailyAgenda = {
  overdueTasks: AgendaTask[];
  todayTasks: AgendaTask[];
  followUps: AgendaLead[];
  newLeads: AgendaLead[];
  /** True when every bucket is empty — caller can skip sending. */
  empty: boolean;
};

const CLOSED = ["signed", "rejected", "spam"];

function firstName(full: string | null): string {
  return (full ?? "").trim().split(/\s+/)[0] || "Lead";
}

function leadName(rel: unknown): string | null {
  if (!rel) return null;
  const obj = Array.isArray(rel) ? rel[0] : rel;
  return (obj as { full_name?: string } | null)?.full_name ?? null;
}

/**
 * The day's actionable items for the agenda email: open tasks due today or
 * overdue, follow-ups that have come due, and new unassigned intake. Kept
 * PII-light — task titles (firm-authored) and lead first names only, never
 * contact details or case descriptions. Links carry the rest.
 */
export async function getDailyAgenda(
  supabase: SupabaseClient,
): Promise<DailyAgenda> {
  const endToday = new Date();
  endToday.setHours(23, 59, 59, 999);
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const nowIso = new Date().toISOString();

  const [{ data: taskRows }, { data: dueRows }, { data: newRows }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("title, due_at, lead_id, leads(full_name)")
        .eq("done", false)
        .not("due_at", "is", null)
        .lte("due_at", endToday.toISOString())
        .order("due_at", { ascending: true })
        .limit(50),
      supabase
        .from("leads")
        .select("id, full_name, follow_up_at")
        .not("follow_up_at", "is", null)
        .lte("follow_up_at", nowIso)
        .not("status", "in", `(${CLOSED.join(",")})`)
        .order("follow_up_at", { ascending: true })
        .limit(25),
      supabase
        .from("leads")
        .select("id, full_name, created_at")
        .eq("status", "new")
        .is("assigned_to", null)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

  const startMs = startToday.getTime();
  const overdueTasks: AgendaTask[] = [];
  const todayTasks: AgendaTask[] = [];
  for (const t of taskRows ?? []) {
    const item: AgendaTask = {
      title: t.title as string,
      dueAt: (t.due_at as string | null) ?? null,
      leadId: (t.lead_id as string | null) ?? null,
    };
    const ms = item.dueAt ? new Date(item.dueAt).getTime() : 0;
    if (ms < startMs) overdueTasks.push(item);
    else todayTasks.push(item);
    void leadName(t.leads); // name intentionally not surfaced in the email
  }

  const followUps: AgendaLead[] = (dueRows ?? []).map((l) => ({
    id: l.id as string,
    firstName: firstName(l.full_name as string | null),
    at: l.follow_up_at as string,
  }));
  const newLeads: AgendaLead[] = (newRows ?? []).map((l) => ({
    id: l.id as string,
    firstName: firstName(l.full_name as string | null),
    at: l.created_at as string,
  }));

  const empty =
    overdueTasks.length === 0 &&
    todayTasks.length === 0 &&
    followUps.length === 0 &&
    newLeads.length === 0;

  return { overdueTasks, todayTasks, followUps, newLeads, empty };
}
