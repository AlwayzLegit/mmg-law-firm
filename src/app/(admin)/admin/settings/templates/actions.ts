"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

const UpsertInput = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1, "Label is required").max(120),
  channel: z.enum(["sms", "email"]),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1, "Body can't be empty").max(2000),
  sort_order: z.coerce.number().int().min(0).max(9999).optional(),
});

export async function upsertTemplate(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = UpsertInput.safeParse({
    id: formData.get("id") || undefined,
    label: formData.get("label"),
    channel: formData.get("channel"),
    subject: formData.get("subject") ?? undefined,
    body: formData.get("body"),
    sort_order: formData.get("sort_order") ?? undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { id, channel, subject, body, label, sort_order } = parsed.data;

  const supabase = await getServerSupabase();
  const row = {
    label,
    channel,
    subject: channel === "email" ? subject || null : null,
    body,
    sort_order: sort_order ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await supabase
      .from("message_templates")
      .update(row)
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("message_templates")
      .insert({ ...row, created_by: user.id });
    if (error) return { ok: false, error: error.message };
  }

  logAudit({
    actor_id: user.id,
    entity: "message_templates",
    entity_id: id ?? null,
    action: id ? "template_updated" : "template_created",
    diff: { label, channel },
  });

  revalidatePath("/admin/settings/templates");
  return { ok: true };
}

const ToggleInput = z.object({
  id: z.string().uuid(),
  active: z.enum(["0", "1"]),
});

export async function toggleTemplate(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const parsed = ToggleInput.safeParse({
    id: formData.get("id"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("message_templates")
    .update({ is_active: parsed.data.active === "1" })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "message_templates",
    entity_id: parsed.data.id,
    action: "template_toggled",
  });
  revalidatePath("/admin/settings/templates");
  return { ok: true };
}

const DeleteInput = z.object({ id: z.string().uuid() });

export async function deleteTemplate(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const parsed = DeleteInput.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "message_templates",
    entity_id: parsed.data.id,
    action: "template_deleted",
  });
  revalidatePath("/admin/settings/templates");
  return { ok: true };
}
