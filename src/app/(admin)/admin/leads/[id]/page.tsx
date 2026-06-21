import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Copy, Mail, Phone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getTagVocabulary } from "@/lib/data/lead-tags";
import {
  getLeadQueueIds,
  neighborsOf,
  parseLeadFilters,
} from "@/lib/data/lead-queue";
import { getServerSupabase } from "@/lib/supabase/server";

import AssignControl, { type AdminOption } from "./assign-control";
import ConflictCheckButton from "./conflict-check";
import FollowUpControl from "./follow-up-control";
import LeadActivity, { type ActivityEvent } from "./lead-activity";
import NoteCompose from "./note-compose";
import NoteItem from "./note-item";
import StatusControl from "./status-control";
import TagsControl from "./tags-control";

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
  const activity: ActivityEvent[] = (auditRows ?? []).map((r) => ({
    id: r.id as string,
    action: r.action as string,
    diff: (r.diff as Record<string, unknown> | null) ?? null,
    ts: r.ts as string,
    actorLabel: r.actor_id
      ? (actorName.get(r.actor_id as string) ?? "An admin")
      : "System / public form",
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-primary text-sm"
        >
          ← Back to leads
        </Link>

        {neighbors.index >= 0 && neighbors.total > 1 ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              {neighbors.index + 1} of {neighbors.total}
            </span>
            {neighbors.prevId ? (
              <Link
                href={neighborHref(neighbors.prevId)}
                rel="prev"
                className="border-border hover:bg-secondary inline-flex items-center gap-1 rounded-md border px-2 py-1 font-medium"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Prev
              </Link>
            ) : (
              <span className="border-border text-muted-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 opacity-50">
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Prev
              </span>
            )}
            {neighbors.nextId ? (
              <Link
                href={neighborHref(neighbors.nextId)}
                rel="next"
                className="border-border hover:bg-secondary inline-flex items-center gap-1 rounded-md border px-2 py-1 font-medium"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : (
              <span className="border-border text-muted-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 opacity-50">
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-4">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          {lead.full_name}
        </h1>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
            lead.status === "signed"
              ? "bg-success/10 text-success"
              : lead.status === "spam" || lead.status === "rejected"
                ? "bg-destructive/10 text-destructive"
                : "bg-secondary"
          }`}
        >
          {lead.status}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {related.length > 0 ? (
            <Card className="border-warning/40 bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Copy className="text-warning h-4 w-4" aria-hidden />
                  Possible duplicate
                  {related.length > 1 ? "s" : ""} ({related.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3 text-xs">
                  {related.length === 1
                    ? "Another lead shares"
                    : "Other leads share"}{" "}
                  this person&apos;s phone or email — likely a repeat
                  submission.
                </p>
                <ul className="divide-border divide-y">
                  {related.map((r) => {
                    const matches: string[] = [];
                    if (lead.phone && r.phone === lead.phone)
                      matches.push("phone");
                    if (lead.email && r.email === lead.email)
                      matches.push("email");
                    return (
                      <li key={r.id} className="py-2 first:pt-0 last:pb-0">
                        <Link
                          href={`/admin/leads/${r.id}`}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0">
                            <span className="hover:text-primary font-medium">
                              {r.full_name}
                            </span>
                            <span className="text-muted-foreground block text-xs">
                              {new Date(r.created_at).toLocaleDateString(
                                "en-US",
                              )}{" "}
                              · matches {matches.join(" + ")}
                            </span>
                          </span>
                          <span className="bg-secondary flex-none rounded-md px-2 py-0.5 text-xs font-medium capitalize">
                            {r.status}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <ContactRow
                icon={<Phone className="text-primary h-4 w-4" aria-hidden />}
                value={lead.phone}
                href={`tel:${lead.phone}`}
              />
              {lead.email ? (
                <ContactRow
                  icon={<Mail className="text-primary h-4 w-4" aria-hidden />}
                  value={lead.email}
                  href={`mailto:${lead.email}`}
                />
              ) : null}
              <Pair
                label="Preferred contact"
                value={lead.preferred_contact ?? "—"}
              />
              <Pair
                label="Submitted"
                value={new Date(lead.created_at).toLocaleString("en-US")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Case</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Pair label="Practice area" value={practiceAreaName ?? "—"} />
              <Pair label="County" value={countyName ?? "—"} />
              <Pair label="City" value={cityName ?? "—"} />
              <Pair label="Incident date" value={lead.incident_date ?? "—"} />
              <Pair
                label="Has attorney"
                value={lead.has_attorney ? "Yes" : "No"}
              />
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                  Description
                </p>
                <p className="mt-2 whitespace-pre-line">
                  {lead.description ?? "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">TCPA consent snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Pair
                label="Consent given"
                value={lead.consent_contact ? "Yes" : "No"}
              />
              <Pair
                label="At"
                value={
                  lead.consent_ts
                    ? new Date(lead.consent_ts).toLocaleString("en-US")
                    : "—"
                }
              />
              <Pair label="From IP" value={lead.consent_ip ?? "—"} />
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                  Text shown
                </p>
                <p className="mt-2 text-xs leading-relaxed whitespace-pre-line">
                  {lead.consent_text ?? "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attribution</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Pair label="Source URL" value={lead.source_url ?? "—"} />
              <Pair label="Referrer" value={lead.referrer ?? "—"} />
              <Pair label="UTM source" value={lead.utm_source ?? "—"} />
              <Pair label="UTM medium" value={lead.utm_medium ?? "—"} />
              <Pair label="UTM campaign" value={lead.utm_campaign ?? "—"} />
              <Pair label="gclid" value={lead.gclid ?? "—"} />
              <Pair label="User agent" value={lead.user_agent ?? "—"} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusControl
                leadId={lead.id}
                currentStatus={lead.status}
                currentReason={lead.rejection_reason}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned to</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-muted-foreground text-xs">
                {assignedLabel
                  ? `Currently ${assignedLabel}.`
                  : "Unassigned. Pick an admin to take ownership."}
              </p>
              <AssignControl
                leadId={lead.id}
                current={lead.assigned_to ?? null}
                admins={admins}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Follow-up</CardTitle>
            </CardHeader>
            <CardContent>
              <FollowUpControl
                leadId={lead.id}
                current={lead.follow_up_at ?? null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <TagsControl
                leadId={lead.id}
                initial={
                  Array.isArray(lead.tags) ? (lead.tags as string[]) : []
                }
                suggestions={tagVocabulary}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conflict check</CardTitle>
            </CardHeader>
            <CardContent>
              <ConflictCheckButton
                leadId={lead.id}
                lastCheckedAt={lead.conflict_checked_at}
                lastClear={lead.conflict_clear}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        canModify:
                          n.author_id === user.id || profile.role === "owner",
                      }}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No notes yet — write the first one above.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadActivity events={activity} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  value,
  href,
}: {
  icon: React.ReactNode;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="text-foreground hover:text-primary flex items-center gap-2"
    >
      <span>{icon}</span>
      <span>{value}</span>
    </a>
  );
}

function Pair({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-2">
      <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
        {label}
      </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
