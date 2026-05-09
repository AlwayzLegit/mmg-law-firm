"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

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
  void supabase.from("audit_log").insert({
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

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "leads",
    entity_id: parsed.data.leadId,
    action: "note_added",
  });

  revalidatePath(`/admin/leads/${parsed.data.leadId}`);
  return { ok: true };
}

