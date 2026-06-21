"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAuditMany } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

const STATUS_VALUES = [
  "new",
  "contacted",
  "qualified",
  "signed",
  "rejected",
  "spam",
] as const;

const BulkStatusInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(STATUS_VALUES),
});

const BulkAssignInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

const MoveInput = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUS_VALUES),
});

export type BulkResult =
  | { ok: true; updated: number }
  | { ok: false; error: string };

function parseIds(formData: FormData): string[] {
  return formData
    .getAll("ids")
    .map((v) => String(v))
    .filter(Boolean);
}

export async function bulkUpdateStatus(
  formData: FormData,
): Promise<BulkResult> {
  const { user } = await requireAdmin();

  const parsed = BulkStatusInput.safeParse({
    ids: parseIds(formData),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("leads")
    .update({ status: parsed.data.status })
    .in("id", parsed.data.ids)
    .select("id");
  if (error) return { ok: false, error: error.message };

  if (data && data.length > 0) {
    logAuditMany(
      data.map((r) => ({
        actor_id: user.id,
        entity: "leads",
        entity_id: r.id,
        action: "bulk_status_change",
        diff: { to: parsed.data.status },
      })),
    );
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  for (const id of parsed.data.ids) {
    revalidatePath(`/admin/leads/${id}`);
  }

  return { ok: true, updated: data?.length ?? 0 };
}

/** Move one lead to a new status — the kanban board's drag/drop mutation. */
export async function moveLeadStatus(formData: FormData): Promise<BulkResult> {
  const { user } = await requireAdmin();

  const parsed = MoveInput.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("leads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return { ok: false, error: error.message };

  if (data && data.length > 0) {
    logAuditMany([
      {
        actor_id: user.id,
        entity: "leads",
        entity_id: parsed.data.id,
        action: "status_change",
        diff: { to: parsed.data.status },
      },
    ]);
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/board");
  revalidatePath("/admin");
  revalidatePath(`/admin/leads/${parsed.data.id}`);

  return { ok: true, updated: data?.length ?? 0 };
}

export async function bulkAssignToMe(formData: FormData): Promise<BulkResult> {
  const { user } = await requireAdmin();

  const parsed = BulkAssignInput.safeParse({ ids: parseIds(formData) });
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("leads")
    .update({ assigned_to: user.id })
    .in("id", parsed.data.ids)
    .select("id");
  if (error) return { ok: false, error: error.message };

  if (data && data.length > 0) {
    logAuditMany(
      data.map((r) => ({
        actor_id: user.id,
        entity: "leads",
        entity_id: r.id,
        action: "bulk_assign",
        diff: { assigned_to: user.id },
      })),
    );
  }

  revalidatePath("/admin/leads");
  for (const id of parsed.data.ids) {
    revalidatePath(`/admin/leads/${id}`);
  }

  return { ok: true, updated: data?.length ?? 0 };
}
