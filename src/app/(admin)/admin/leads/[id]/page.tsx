import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Copy, Mail, Phone } from "lucide-react";

import { LeadStatusPill, Panel, adminBtn } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getTagVocabulary } from "@/lib/data/lead-tags";
import {
  getLeadQueueIds,
  neighborsOf,
  parseLeadFilters,
} from "@/lib/data/lead-queue";
import { getServerSupabase } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import AssignControl, { type AdminOption } from "./assign-control";
import ConflictCheckButton from "./conflict-check";
import FollowUpControl from "./follow-up-control";
import {
  MESSAGE_TEMPLATES,
  type MessageTemplate,
} from "@/lib/data/message-templates";

import LeadActivity, { type ActivityEvent } from "./lead-activity";
import LeadMessages, { type LeadMessage } from "./lead-messages";
import MergeButton from "./merge-button";
import NoteCompose from "./note-compose";
import NoteItem from "./note-item";
import QuickLog from "./quick-log";
import StatusControl from "./status-control";
import TagsControl from "./tags-control";
import {
  TaskList,
  AddTaskForm,
  type TaskItem,
} from "../../tasks/task-ui";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function LeadDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { from } = await searchParams;
  const { user, profile } = await requireAdmin();
  const supabase = await getServerSupabase();

  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      `
        *,
        practice_areas(name),
        counties(name),
        cities(name)
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!lead) notFound();

  const practiceAreaName =
    (lead.practice_areas as { name: string } | null)?.name ?? null;
  const countyName = (lead.counties as { name: string } | null)?.name ?? null;
  const cityName = (lead.cities as { name: string } | null)?.name ?? null;

  // Other submissions from the same person — same phone or email. Two
  // parameterized .eq() queries (deduped) avoid any .or() filter injection
  // from stored values.
  type Related = {
    id: string;
    full_name: string;
    status: string;
    created_at: string;
    phone: string | null;
    email: string | null;
  };
  const relatedMap = new Map<string, Related>();
  if (lead.phone) {
    const { data } = await supabase
      .from("leads")
      .select("id, full_name, status, created_at, phone, email")
      .eq("phone", lead.phone)
      .neq("id", id)
      .is("merged_into", null)
      .order("created_at", { ascending: false })
      .limit(10);
    for (const r of (data ?? []) as Related[]) relatedMap.set(r.id, r);
  }
  if (lead.email) {
    const { data } = await supabase
      .from("leads")
      .select("id, full_name, status, created_at, phone, email")
      .eq("email", lead.email)
      .neq("id", id)
      .is("merged_into", null)
      .order("created_at", { ascending: false })
      .limit(10);
    for (const r of (data ?? []) as Related[]) relatedMap.set(r.id, r);
  }
  const related = [...relatedMap.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);

  const tagVocabulary = await getTagVocabulary(supabase);

  // Prev/next navigation through the filtered queue the admin came from.
  const fromQs = (from ?? "").slice(0, 400);
  let neighbors = {
    prevId: null as string | null,
    nextId: null as string | null,
    index: -1,
    total: 0,
  };
  if (fromQs) {
    const filters = parseLeadFilters(new URLSearchParams(fromQs));
    const ids = await getLeadQueueIds(supabase, filters, user.id);
    neighbors = neighborsOf(ids, id);
  }
  const neighborHref = (nid: string) =>
    `/admin/leads/${nid}${fromQs ? `?from=${encodeURIComponent(fromQs)}` : ""}`;
  const backHref = `/admin/leads${fromQs ? `?${fromQs}` : ""}`;

  const { data: notes } = await supabase
    .from("lead_notes")
    .select("id, body, author_id, created_at, updated_at, is_pinned")
    .eq("lead_id", id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  // Admins available as lead assignees.
  const { data: adminRows } = await supabase
    .from("admin_profiles")
    .select("user_id, full_name, role")
    .order("full_name", { ascending: true });
  const admins: AdminOption[] = (adminRows ?? []).map((a) => ({
    userId: a.user_id as string,
    label:
      (a.full_name as string | null) ?? `${a.role} (${a.user_id.slice(0, 8)})`,
  }));
  const assignedLabel =
    admins.find((a) => a.userId === lead.assigned_to)?.label ?? null;

  // Activity timeline from the audit log for this lead.
  const { data: auditRows } = await supabase
    .from("audit_log")
    .select("id, actor_id, action, diff, ts")
    .eq("entity", "leads")
    .eq("entity_id", id)
    .order("ts", { ascending: false })
    .limit(50);
  const actorName = new Map(admins.map((a) => [a.userId, a.label]));

  // Active message templates (DB-managed, with static fallback if none exist).
  const { data: templateRows } = await supabase
    .from("message_templates")
    .select("id, label, channel, subject, body")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const templates =
    templateRows && templateRows.length > 0
      ? (templateRows as MessageTemplate[])
      : MESSAGE_TEMPLATES;

  // Message thread (outbound SMS/email + inbound replies).
  const { data: messageRows } = await supabase
    .from("lead_messages")
    .select(
      "id, channel, direction, subject, body, status, error, author_id, created_at",
    )
    .eq("lead_id", id)
    .order("created_at", { ascending: true })
    .limit(200);
  const messages: LeadMessage[] = (messageRows ?? []).map((m) => ({
    id: m.id as string,
    channel: m.channel as "sms" | "email",
    direction: m.direction as "outbound" | "inbound",
    subject: (m.subject as string | null) ?? null,
    body: m.body as string,
    status: m.status as string,
    error: (m.error as string | null) ?? null,
    createdAt: m.created_at as string,
    authorLabel: m.author_id
      ? (actorName.get(m.author_id as string) ?? "An admin")
      : null,
  }));

  // Open + recently-done tasks for this lead.
  const { data: taskRows } = await supabase
    .from("tasks")
    .select("id, title, due_at, done, lead_id, assigned_to")
    .eq("lead_id", id)
    .order("done", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(50);
  const leadTasks: TaskItem[] = (taskRows ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    dueAt: (t.due_at as string | null) ?? null,
    done: Boolean(t.done),
    leadId: id,
    leadName: null,
    assigneeLabel: t.assigned_to
      ? (actorName.get(t.assigned_to as string) ?? null)
      : null,
  }));

  const activity: ActivityEvent[] = (auditRows ?? []).map((r) => ({
    id: r.id as string,
    action: r.action as string,
    diff: (r.diff as Record<string, unknown> | null) ?? null,
    ts: r.ts as string,
    actorLabel: r.actor_id
      ? (actorName.get(r.actor_id as string) ?? "An admin")
      : "System / public form",
  }));

  const initials = lead.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("");
  const incident = lead.incident_date ? new Date(`${lead.incident_date}T12:00:00`) : null;
  const addMonths = (d: Date, m: number) => {
    const x = new Date(d);
    x.setMonth(x.getMonth() + m);
    return x;
  };
  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const govDeadline = incident && !Number.isNaN(incident.getTime()) ? fmtDate(addMonths(incident, 6)) : "—";
  const genDeadline = incident && !Number.isNaN(incident.getTime()) ? fmtDate(addMonths(incident, 24)) : "—";
  const received = new Date(lead.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const sourceLabel = [lead.utm_source, lead.utm_medium].filter(Boolean).join(" / ") || (lead.referrer ? "referral" : "website form");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="text-stone hover:text-foreground inline-flex items-center gap-1.5 text-[13px] no-underline">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Back to leads
        </Link>

        {neighbors.index >= 0 && neighbors.total > 1 ? (
          <div className="text-stone flex items-center gap-2 text-xs">
            <span>
              {neighbors.index + 1} of {neighbors.total}
            </span>
            {neighbors.prevId ? (
              <Link href={neighborHref(neighbors.prevId)} rel="prev" className={adminBtn.pill}>
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Prev
              </Link>
            ) : (
              <span className={cn(adminBtn.pill, "opacity-50")}>
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Prev
              </span>
            )}
            {neighbors.nextId ? (
              <Link href={neighborHref(neighbors.nextId)} rel="next" className={adminBtn.pill}>
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : (
              <span className={cn(adminBtn.pill, "opacity-50")}>
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-3.5 flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-center gap-4">
          <span className="bg-ink text-gold font-display inline-flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full text-lg font-semibold">
            {initials || "?"}
          </span>
          <div>
            <h1 className="font-display text-[30px] leading-[1.1] font-semibold tracking-[-0.02em]">{lead.full_name}</h1>
            <p className="text-stone mt-1 text-[13px]">
              {[practiceAreaName, cityName ?? countyName].filter(Boolean).join(" · ") || "No matter selected"} · received {received} via{" "}
              {sourceLabel}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:${lead.phone}`} className={adminBtn.ink}>
            <Phone className="text-gold h-3.5 w-3.5" aria-hidden />
            Call {lead.phone}
          </a>
          <a href="#communications" className={adminBtn.outline}>
            Text
          </a>
          {lead.email ? (
            <a href={`mailto:${lead.email}`} className={adminBtn.outline}>
              <Mail className="h-3.5 w-3.5" aria-hidden />
              Email
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-[18px]">
        <StatusControl leadId={lead.id} currentStatus={lead.status} currentReason={lead.rejection_reason} />
      </div>

      <div className="mt-3.5 grid items-start gap-3.5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <div className="grid gap-3.5">
          {related.length > 0 ? (
            <Panel
              micro
              className="ring-gold/40 bg-gold/6"
              title={
                <span className="inline-flex items-center gap-2">
                  <Copy className="text-gold-deep h-3.5 w-3.5" aria-hidden />
                  Possible duplicate{related.length > 1 ? "s" : ""} ({related.length})
                </span>
              }
            >
              <p className="text-stone mb-3 text-xs">
                {related.length === 1 ? "Another lead shares" : "Other leads share"} this person&apos;s phone or email — likely a
                repeat submission.
              </p>
              <ul className="divide-ink/6 m-0 list-none divide-y p-0">
                {related.map((r) => {
                  const matches: string[] = [];
                  if (lead.phone && r.phone === lead.phone) matches.push("phone");
                  if (lead.email && r.email === lead.email) matches.push("email");
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                      <Link href={`/admin/leads/${r.id}`} className="text-foreground min-w-0 no-underline">
                        <span className="hover:text-gold-deep font-semibold">{r.full_name}</span>
                        <span className="text-stone block text-xs">
                          {new Date(r.created_at).toLocaleDateString("en-US")} · matches {matches.join(" + ")}
                        </span>
                      </Link>
                      <span className="flex flex-none items-center gap-2">
                        <LeadStatusPill status={r.status} />
                        <MergeButton primaryId={lead.id} duplicateId={r.id} duplicateName={r.full_name} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ) : null}

          <Panel micro title="What happened">
            <p className="m-0 text-[15px] leading-[1.6] whitespace-pre-line">{lead.description ?? "—"}</p>
            <div className="text-stone mt-3.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
              <span>
                Incident date: <strong className="text-foreground font-semibold">{lead.incident_date ?? "—"}</strong>
              </span>
              <span>
                Practice area: <strong className="text-foreground font-semibold">{practiceAreaName ?? "—"}</strong>
              </span>
              <span>
                Location: <strong className="text-foreground font-semibold">{[cityName, countyName].filter(Boolean).join(", ") || "—"}</strong>
              </span>
              <span>
                Has attorney: <strong className="text-foreground font-semibold">{lead.has_attorney ? "Yes" : "No"}</strong>
              </span>
              <span>
                Consent to text:{" "}
                <strong className={cn("font-semibold", lead.consent_contact ? "text-[#15803d]" : "text-[#b91c1c]")}>
                  {lead.consent_contact ? "Yes" : "No"}
                </strong>
              </span>
            </div>
          </Panel>

          <Panel micro title="Deadlines" action={<span className="text-stone text-xs">from incident date</span>}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
              <div className="bg-paper rounded-[10px] p-3.5">
                <p className="text-stone m-0 text-[11px] tracking-[0.12em] uppercase">Gov. claim (6 mo)</p>
                <p className="font-display m-0 mt-1 text-xl leading-none font-semibold">{govDeadline}</p>
              </div>
              <div className="bg-paper rounded-[10px] p-3.5">
                <p className="text-stone m-0 text-[11px] tracking-[0.12em] uppercase">Statute (2 yr)</p>
                <p className="font-display m-0 mt-1 text-xl leading-none font-semibold">{genDeadline}</p>
              </div>
              <div className="bg-paper rounded-[10px] p-3.5">
                <p className="text-stone m-0 text-[11px] tracking-[0.12em] uppercase">Conflict check</p>
                <div className="mt-1.5">
                  <ConflictCheckButton leadId={lead.id} lastCheckedAt={lead.conflict_checked_at} lastClear={lead.conflict_clear} />
                </div>
              </div>
            </div>
            <p className="text-stone mt-2.5 text-[11px]">
              General rules only (CCP §335.1; Gov. Code §911.2). Exceptions apply — confirm before relying on either date.
            </p>
          </Panel>

          <Panel micro id="communications" title="Communications">
            <LeadMessages
              leadId={lead.id}
              fullName={lead.full_name}
              hasPhone={Boolean(lead.phone)}
              hasEmail={Boolean(lead.email)}
              messages={messages}
              templates={templates}
            />
          </Panel>

          <Panel micro title="Notes">
            <div className="space-y-4">
              <QuickLog leadId={lead.id} />
              <NoteCompose leadId={lead.id} />
              {notes && notes.length > 0 ? (
                <ul className="space-y-3">
                  {notes.map((n) => (
                    <NoteItem
                      key={n.id}
                      leadId={lead.id}
                      note={{
                        id: n.id,
                        body: n.body,
                        createdAt: n.created_at,
                        updatedAt: n.updated_at ?? null,
                        isPinned: n.is_pinned ?? false,
                        canModify: n.author_id === user.id || profile.role === "owner",
                      }}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-stone text-sm">No notes yet — write the first one above.</p>
              )}
            </div>
          </Panel>

          <Panel micro title="Activity">
            <LeadActivity events={activity} />
          </Panel>
        </div>

        <div className="grid gap-3.5">
          <Panel micro title="Contact">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2 text-[13.5px]">
              <dt className="text-stone">Phone</dt>
              <dd className="m-0 font-semibold">
                <a href={`tel:${lead.phone}`} className="text-foreground no-underline">
                  {lead.phone}
                </a>
              </dd>
              <dt className="text-stone">Email</dt>
              <dd className="m-0 [overflow-wrap:anywhere]">
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="text-foreground no-underline">
                    {lead.email}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
              <dt className="text-stone">Prefers</dt>
              <dd className="m-0 capitalize">{lead.preferred_contact ?? "—"}</dd>
              <dt className="text-stone">City</dt>
              <dd className="m-0">{cityName ?? countyName ?? "—"}</dd>
              <dt className="text-stone">Source</dt>
              <dd className="m-0">{sourceLabel}</dd>
              <dt className="text-stone">Submitted</dt>
              <dd className="m-0">{new Date(lead.created_at).toLocaleString("en-US")}</dd>
            </dl>
          </Panel>

          <Panel micro title="Assignment & follow-up">
            <div className="grid gap-3">
              <div>
                <p className="text-stone mb-1 text-xs">
                  {assignedLabel ? `Assigned to ${assignedLabel}.` : "Unassigned. Pick an admin to take ownership."}
                </p>
                <AssignControl leadId={lead.id} current={lead.assigned_to ?? null} admins={admins} />
              </div>
              <FollowUpControl leadId={lead.id} current={lead.follow_up_at ?? null} />
            </div>
          </Panel>

          <Panel micro title="Tags">
            <TagsControl leadId={lead.id} initial={Array.isArray(lead.tags) ? (lead.tags as string[]) : []} suggestions={tagVocabulary} />
          </Panel>

          <Panel micro title="Tasks">
            <div className="space-y-3">
              <TaskList tasks={leadTasks} showLead={false} emptyText="No tasks for this lead yet." />
              <AddTaskForm leadId={lead.id} />
            </div>
          </Panel>

          <Panel micro title="TCPA consent snapshot">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2 text-[13px]">
              <dt className="text-stone">Given</dt>
              <dd className="m-0">{lead.consent_contact ? "Yes" : "No"}</dd>
              <dt className="text-stone">At</dt>
              <dd className="m-0">{lead.consent_ts ? new Date(lead.consent_ts).toLocaleString("en-US") : "—"}</dd>
              <dt className="text-stone">From IP</dt>
              <dd className="m-0">{lead.consent_ip ?? "—"}</dd>
            </dl>
            <details className="mt-2.5">
              <summary className="text-stone cursor-pointer text-xs">Text shown at consent</summary>
              <p className="text-stone mt-2 text-xs leading-relaxed whitespace-pre-line">{lead.consent_text ?? "—"}</p>
            </details>
          </Panel>

          <Panel micro title="Attribution">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2 text-[12.5px] [overflow-wrap:anywhere]">
              <dt className="text-stone">Source URL</dt>
              <dd className="m-0">{lead.source_url ?? "—"}</dd>
              <dt className="text-stone">Referrer</dt>
              <dd className="m-0">{lead.referrer ?? "—"}</dd>
              <dt className="text-stone">UTM</dt>
              <dd className="m-0">{[lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ") || "—"}</dd>
              <dt className="text-stone">gclid</dt>
              <dd className="m-0">{lead.gclid ?? "—"}</dd>
              <dt className="text-stone">User agent</dt>
              <dd className="m-0">{lead.user_agent ?? "—"}</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
