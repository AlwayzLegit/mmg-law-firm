import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  deadlineFor,
  ruleForPracticeArea,
  type Deadline,
  type IntakeChecklist,
} from "@/lib/leads/limitations";
import { ageMinutes, slaTone, type SlaTone } from "@/lib/leads/sla";

export type AgendaTask = { title: string; dueAt: string | null; leadId: string | null };
export type AgendaLead = { id: string; firstName: string; at: string };

/** A lead still in "new": nobody has acted on it since it arrived. */
export type WaitingLead = AgendaLead & {
  minutes: number;
  tone: SlaTone;
  assigned: boolean;
};

/** A statute-of-limitations estimate that is close (or passed). */
export type AgendaDeadline = {
  id: string;
  firstName: string;
  /** YYYY-MM-DD */
  date: string;
  daysLeft: number;
  tone: Deadline["tone"];
  ruleLabel: string;
};

export type DailyAgenda = {
  /** Leads waiting for a first call, oldest first. */
  waiting: WaitingLead[];
  /** How many of `waiting` have been waiting over the warn threshold. */
  breaches: number;
  overdueTasks: AgendaTask[];
  todayTasks: AgendaTask[];
  followUps: AgendaLead[];
  /** Statute deadlines within `DEADLINE_WINDOW_DAYS`, soonest first. */
  deadlines: AgendaDeadline[];
  /** True when every bucket is empty — caller can skip sending. */
  empty: boolean;
};

const CLOSED = ["signed", "rejected", "spam"];

/** Deadlines further out than this stay off the email. */
export const DEADLINE_WINDOW_DAYS = 180;

export function firstName(full: string | null): string {
  return (full ?? "").trim().split(/\s+/)[0] || "Lead";
}

function relSlug(rel: unknown): string | null {
  if (!rel) return null;
  const obj = Array.isArray(rel) ? rel[0] : rel;
  return (obj as { slug?: string } | null)?.slug ?? null;
}

export type WaitingRow = {
  id: string;
  full_name: string | null;
  created_at: string;
  assigned_to: string | null;
};

/** Pure shaping of `status = 'new'` rows into waiting leads, oldest first. */
export function shapeWaiting(rows: WaitingRow[], now = Date.now()): WaitingLead[] {
  return rows
    .map((l) => {
      const minutes = ageMinutes(l.created_at, now);
      return {
        id: l.id,
        firstName: firstName(l.full_name),
        at: l.created_at,
        minutes,
        tone: slaTone(minutes),
        assigned: Boolean(l.assigned_to),
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

export type DeadlineRow = {
  id: string;
  full_name: string | null;
  incident_date: string | null;
  intake: IntakeChecklist | null;
  practice_areas: unknown;
};

/** Pure shaping of open leads into near deadlines, soonest first. */
export function shapeDeadlines(
  rows: DeadlineRow[],
  now = Date.now(),
  windowDays = DEADLINE_WINDOW_DAYS,
): AgendaDeadline[] {
  const out: AgendaDeadline[] = [];
  for (const l of rows) {
    const intake = l.intake ?? {};
    const d = deadlineFor(
      l.incident_date,
      ruleForPracticeArea(relSlug(l.practice_areas), {
        governmentEntity: intake.government_entity,
      }),
      now,
    );
    if (!d || d.daysLeft > windowDays) continue;
    out.push({
      id: l.id,
      firstName: firstName(l.full_name),
      date: d.date,
      daysLeft: d.daysLeft,
      tone: d.tone,
      ruleLabel: d.rule.label,
    });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

/**
 * The day's actionable items for the agenda email: leads waiting for a first
 * call (the speed-to-lead queue from /admin/today), open tasks due today or
 * overdue, follow-ups that have come due, and statute-of-limitations
 * estimates inside the window. Kept PII-light — task titles (firm-authored)
 * and lead first names only, never contact details or case descriptions.
 * Links carry the rest.
 */
export async function getDailyAgenda(
  supabase: SupabaseClient,
  now = Date.now(),
): Promise<DailyAgenda> {
  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const nowIso = new Date(now).toISOString();

  const [
    { data: taskRows },
    { data: dueRows },
    { data: waitingRows },
    { data: solRows },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("title, due_at, lead_id")
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
      .select("id, full_name, created_at, assigned_to")
      .eq("status", "new")
      .is("merged_into", null)
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("leads")
      .select("id, full_name, incident_date, intake, practice_areas(slug)")
      .not("incident_date", "is", null)
      .not("status", "in", `(${CLOSED.join(",")})`)
      .is("merged_into", null)
      .limit(500),
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
  }

  const followUps: AgendaLead[] = (dueRows ?? []).map((l) => ({
    id: l.id as string,
    firstName: firstName(l.full_name as string | null),
    at: l.follow_up_at as string,
  }));

  const waiting = shapeWaiting((waitingRows ?? []) as WaitingRow[], now);
  const breaches = waiting.filter((l) => l.tone === "breach").length;
  const deadlines = shapeDeadlines((solRows ?? []) as DeadlineRow[], now).slice(
    0,
    20,
  );

  const empty =
    waiting.length === 0 &&
    overdueTasks.length === 0 &&
    todayTasks.length === 0 &&
    followUps.length === 0 &&
    deadlines.length === 0;

  return {
    waiting,
    breaches,
    overdueTasks,
    todayTasks,
    followUps,
    deadlines,
    empty,
  };
}
