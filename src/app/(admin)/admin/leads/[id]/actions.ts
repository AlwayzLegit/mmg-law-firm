"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

import { LEAD_STATUSES, type LeadStatus } from "./statuses";

const StatusInput = z.object({
  leadId: z.string().uuid(),
  status: z.enum(LEAD_STATUSES),
  rejection_reason: z.string().trim().max(500).optional(),
});

const NoteInput = z.object({
  leadId: z.string().uuid(),
  body: z.string().trim().min(1, "Note can't be empty").max(4000),
});

const ConflictInput = z.object({ leadId: z.string().uuid() });

export type ConflictHit = {
  source: "leads" | "case_results";
  id: string;
  label: string;
  detail: string;
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateLeadStatus(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = StatusInput.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
    rejection_reason: formData.get("rejection_reason") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  const supabase = await getServerSupabase();

  const { data: prev, error: prevErr } = await supabase
    .from("leads")
    .select("status")
    .eq("id", parsed.data.leadId)
    .maybeSingle();
  if (prevErr || !prev) {
    return { ok: false, error: prevErr?.message ?? "Lead not found" };
  }

  const updates: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "rejected" && parsed.data.rejection_reason) {
    updates.rejection_reason = parsed.data.rejection_reason;
  }
  if (parsed.data.status === "signed" || parsed.data.status === "qualified") {
    updates.assigned_to = user.id;
  }

  const { error: upErr } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", parsed.data.leadId);
  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  // Best-effort audit log; don't fail the request on this.
  logAudit({
    actor_id: user.id,
    entity: "leads",
    entity_id: parsed.data.leadId,
    action: "status_change",
    diff: {
      from: prev.status as LeadStatus,
      to: parsed.data.status,
      ...(updates.rejection_reason
        ? { rejection_reason: updates.rejection_reason }
        : {}),
    },
  });

  revalidatePath(`/admin/leads/${parsed.data.leadId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { ok: true };
}

export async function runConflictCheck(
  formData: FormData,
): Promise<{ ok: true; hits: ConflictHit[] } | { ok: false; error: string }> {
  const { user } = await requireAdmin();

  const parsed = ConflictInput.safeParse({ leadId: formData.get("leadId") });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await getServerSupabase();

  const { data: subject, error: subjErr } = await supabase
    .from("leads")
    .select("id, full_name, phone, email, description")
    .eq("id", parsed.data.leadId)
    .maybeSingle();
  if (subjErr || !subject) {
    return { ok: false, error: subjErr?.message ?? "Lead not found" };
  }

  const hits: ConflictHit[] = [];

  // Same person, prior contact: name OR phone OR email match on another lead.
  // ILIKE on full_name catches casing differences. Phone is already E.164.
  const nameLike = `%${subject.full_name.replace(/[%_]/g, "")}%`;
  const orParts: string[] = [`full_name.ilike.${nameLike}`];
  if (subject.phone) orParts.push(`phone.eq.${subject.phone}`);
  if (subject.email) orParts.push(`email.eq.${subject.email}`);

  const { data: priorLeads, error: priorErr } = await supabase
    .from("leads")
    .select("id, full_name, phone, email, status, created_at")
    .neq("id", subject.id)
    .or(orParts.join(","))
    .limit(20);
  if (!priorErr && priorLeads) {
    for (const p of priorLeads) {
      hits.push({
        source: "leads",
        id: p.id,
        label: `Prior lead — ${p.full_name}`,
        detail: `${p.phone}${p.email ? ` · ${p.email}` : ""} · status=${p.status} · ${new Date(p.created_at).toLocaleDateString("en-US")}`,
      });
    }
  }

  // Adverse-party check: if the description mentions a name that already
  // appears in our case_results (we may already represent the other side),
  // surface it. We use the lead's own surname as a heuristic — and any
  // multi-word capitalized run from the description.
  const tokens = new Set<string>();
  const surname = subject.full_name.trim().split(/\s+/).slice(-1)[0];
  if (surname && surname.length >= 3) tokens.add(surname);

  if (subject.description) {
    const matches = subject.description.match(
      /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2}\b/g,
    );
    if (matches) {
      for (const m of matches) tokens.add(m);
    }
  }

  if (tokens.size > 0) {
    for (const tok of tokens) {
      const safe = tok.replace(/[%_]/g, "");
      const { data, error } = await supabase
        .from("case_results")
        .select("id, headline")
        .ilike("headline", `%${safe}%`)
        .limit(5);
      if (!error && data && data.length > 0) {
        for (const r of data) {
          hits.push({
            source: "case_results",
            id: r.id,
            label: `Possible adverse-party match: ${r.headline}`,
            detail: `Token "${tok}" appears in this case-result headline.`,
          });
        }
      }
    }
  }

  // Stamp the conflict_checked_at column so we can see the check ran.
  void supabase
    .from("leads")
    .update({
      conflict_checked_at: new Date().toISOString(),
      conflict_clear: hits.length === 0,
    })
    .eq("id", subject.id);

  logAudit({
    actor_id: user.id,
    entity: "leads",
    entity_id: subject.id,
    action: "conflict_check",
    diff: { hits: hits.length },
  });

  revalidatePath(`/admin/leads/${subject.id}`);

  return { ok: true, hits };
}

export async function addLeadNote(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = NoteInput.safeParse({
    leadId: formData.get("leadId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid note",
    };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("lead_notes").insert({
    lead_id: parsed.data.leadId,
    author_id: user.id,
    body: parsed.data.body,
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  logAudit({
    actor_id: user.id,
    entity: "leads",
    entity_id: parsed.data.leadId,
    action: "note_added",
  });

  revalidatePath(`/admin/leads/${parsed.data.leadId}`);
  return { ok: true };
}

const FollowUpInput = z.object({
  leadId: z.string().uuid(),
  // datetime-local value ("YYYY-MM-DDTHH:MM") or empty to clear.
  follow_up_at: z.string().trim().optional(),
});

/** Set or clear a lead's follow-up reminder. Empty value clears it. */
export async function setLeadFollowUp(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = FollowUpInput.safeParse({
    leadId: formData.get("leadId"),
    follow_up_at: formData.get("follow_up_at") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  let iso: string | null = null;
  if (parsed.data.follow_up_at) {
    const when = new Date(parsed.data.follow_up_at);
    if (Number.isNaN(when.getTime())) {
      return { ok: false, error: "Invalid date." };
    }
    iso = when.toISOString();
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("leads")
    .update({ follow_up_at: iso })
    .eq("id", parsed.data.leadId);
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "leads",
    entity_id: parsed.data.leadId,
    action: iso ? "follow_up_set" : "follow_up_clear",
    ...(iso ? { diff: { follow_up_at: iso } } : {}),
  });

  revalidatePath(`/admin/leads/${parsed.data.leadId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { ok: true };
}

