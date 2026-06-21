"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit, logAuditMany } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/require-admin";
import { normalizeTags } from "@/lib/leads/tags";
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

// -------------------------------------------------------------------
// Saved views — per-admin filter presets for the leads list.
// -------------------------------------------------------------------

export type SimpleResult = { ok: true } | { ok: false; error: string };

const CreateViewInput = z.object({
  name: z.string().trim().min(1, "Name the view").max(60),
  query: z.string().trim().max(500),
});

/** Save the current leads-list filter querystring as a named preset. */
export async function createSavedView(
  formData: FormData,
): Promise<SimpleResult> {
  const { user } = await requireAdmin();

  const parsed = CreateViewInput.safeParse({
    name: formData.get("name"),
    query: formData.get("query") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  // Strip a leading "?" and any page param — a view shouldn't pin a page.
  const sp = new URLSearchParams(parsed.data.query.replace(/^\?/, ""));
  sp.delete("page");

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("lead_saved_views").insert({
    owner_id: user.id,
    name: parsed.data.name,
    query: sp.toString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/leads");
  return { ok: true };
}

const BulkTagInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  tag: z.string().trim().min(1).max(30),
  op: z.enum(["add", "remove"]),
});

/** Add or remove a single tag across the selected leads. */
export async function bulkTag(formData: FormData): Promise<BulkResult> {
  const { user } = await requireAdmin();

  const parsed = BulkTagInput.safeParse({
    ids: parseIds(formData),
    tag: formData.get("tag"),
    op: formData.get("op"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const tag = normalizeTags([parsed.data.tag])[0];
  if (!tag) return { ok: false, error: "Invalid tag" };

  const supabase = await getServerSupabase();
  const { data: rows, error } = await supabase
    .from("leads")
    .select("id, tags")
    .in("id", parsed.data.ids);
  if (error) return { ok: false, error: error.message };

  let updated = 0;
  for (const row of rows ?? []) {
    const cur = (row.tags as string[] | null) ?? [];
    const next =
      parsed.data.op === "add"
        ? normalizeTags([...cur, tag])
        : cur.filter((t) => t !== tag);
    const { error: upErr } = await supabase
      .from("leads")
      .update({ tags: next })
      .eq("id", row.id);
    if (!upErr) updated += 1;
  }

  logAudit({
    actor_id: user.id,
    entity: "leads",
    entity_id: null,
    action: parsed.data.op === "add" ? "bulk_tag_add" : "bulk_tag_remove",
    diff: { tag, leads: updated },
  });

  revalidatePath("/admin/leads");
  return { ok: true, updated };
}

// -------------------------------------------------------------------
// Tag management — rename / merge / delete a tag across all leads.
// -------------------------------------------------------------------

const RenameTagInput = z.object({
  from: z.string().trim().min(1).max(30),
  to: z.string().trim().min(1).max(30),
});

/**
 * Rename a tag everywhere it appears. If the target already exists on a lead,
 * the two collapse into one (a merge) because normalizeTags de-duplicates.
 */
export async function renameTag(formData: FormData): Promise<SimpleResult> {
  const { user } = await requireAdmin();

  const parsed = RenameTagInput.safeParse({
    from: formData.get("from"),
    to: formData.get("to"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const from = normalizeTags([parsed.data.from])[0];
  const to = normalizeTags([parsed.data.to])[0];
  if (!from || !to) return { ok: false, error: "Invalid tag" };
  if (from === to) return { ok: true };

  const supabase = await getServerSupabase();
  const { data: rows, error } = await supabase
    .from("leads")
    .select("id, tags")
    .contains("tags", [from]);
  if (error) return { ok: false, error: error.message };

  let updated = 0;
  for (const row of rows ?? []) {
    const next = normalizeTags(
      (row.tags as string[]).map((t) => (t === from ? to : t)),
    );
    const { error: upErr } = await supabase
      .from("leads")
      .update({ tags: next })
      .eq("id", row.id);
    if (!upErr) updated += 1;
  }

  logAudit({
    actor_id: user.id,
    entity: "leads",
    entity_id: null,
    action: "tag_renamed",
    diff: { from, to, leads: updated },
  });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/tags");
  return { ok: true };
}

const DeleteTagInput = z.object({ tag: z.string().trim().min(1).max(30) });

/** Remove a tag from every lead that has it. */
export async function deleteTag(formData: FormData): Promise<SimpleResult> {
  const { user } = await requireAdmin();

  const parsed = DeleteTagInput.safeParse({ tag: formData.get("tag") });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const tag = normalizeTags([parsed.data.tag])[0];
  if (!tag) return { ok: false, error: "Invalid tag" };

  const supabase = await getServerSupabase();
  const { data: rows, error } = await supabase
    .from("leads")
    .select("id, tags")
    .contains("tags", [tag]);
  if (error) return { ok: false, error: error.message };

  let updated = 0;
  for (const row of rows ?? []) {
    const next = (row.tags as string[]).filter((t) => t !== tag);
    const { error: upErr } = await supabase
      .from("leads")
      .update({ tags: next })
      .eq("id", row.id);
    if (!upErr) updated += 1;
  }

  logAudit({
    actor_id: user.id,
    entity: "leads",
    entity_id: null,
    action: "tag_deleted",
    diff: { tag, leads: updated },
  });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/tags");
  return { ok: true };
}

const DeleteViewInput = z.object({ id: z.string().uuid() });

/** Delete one of the caller's saved views. RLS scopes this to the owner. */
export async function deleteSavedView(
  formData: FormData,
): Promise<SimpleResult> {
  const { user } = await requireAdmin();

  const parsed = DeleteViewInput.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("lead_saved_views")
    .delete()
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/leads");
  return { ok: true };
}
