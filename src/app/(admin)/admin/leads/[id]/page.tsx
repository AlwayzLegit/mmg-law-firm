import { notFound } from "next/navigation";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import ConflictCheckButton from "./conflict-check";
import FollowUpControl from "./follow-up-control";
import NoteCompose from "./note-compose";
import StatusControl from "./status-control";

type Props = { params: Promise<{ id: string }> };

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
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

  const { data: notes } = await supabase
    .from("lead_notes")
    .select("id, body, author_id, created_at")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <Link
        href="/admin/leads"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← Back to leads
      </Link>

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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <ContactRow
                icon={<Phone className="h-4 w-4 text-primary" aria-hidden />}
                value={lead.phone}
                href={`tel:${lead.phone}`}
              />
              {lead.email ? (
                <ContactRow
                  icon={<Mail className="h-4 w-4 text-primary" aria-hidden />}
                  value={lead.email}
                  href={`mailto:${lead.email}`}
                />
              ) : null}
              <Pair label="Preferred contact" value={lead.preferred_contact ?? "—"} />
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
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
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
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Text shown
                </p>
                <p className="mt-2 whitespace-pre-line text-xs leading-relaxed">
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
                    <li
                      key={n.id}
                      className="rounded-md border border-border bg-secondary/30 p-3 text-sm"
                    >
                      <p className="whitespace-pre-line">{n.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("en-US")}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No notes yet — write the first one above.
                </p>
              )}
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
      className="flex items-center gap-2 text-foreground hover:text-primary"
    >
      <span>{icon}</span>
      <span>{value}</span>
    </a>
  );
}

function Pair({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
