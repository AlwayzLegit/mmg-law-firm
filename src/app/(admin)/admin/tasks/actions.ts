"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

const CreateInput = z.object({
  title: z.string().trim().min(1, "Task needs a title").max(300),
  // datetime-local ("YYYY-MM-DDTHH:MM") or empty.
  due_at: z.string().trim().optional(),
  lead_id: z.string().uuid().optional(),
  // Assign to a specific admin, or default to the creator.
  assigned_to: z.string().uuid().or(z.literal("")).optional(),
});

export async function createTask(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = CreateInput.safeParse({
    title: formData.get("title"),
    due_at: formData.get("due_at") ?? undefined,
    lead_id: formData.get("lead_id") || undefined,
    assigned_to: formData.get("assigned_to") ?? undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  let dueIso: string | null = null;
  if (parsed.data.due_at) {
    const when = new Date(parsed.data.due_at);
    if (Number.isNaN(when.getTime())) {
      return { ok: false, error: "Invalid due date." };
    }
    dueIso = when.toISOString();
  }

  const supabase = await getServerSupabase();
  const { data: created, error } = await supabase
    .from("tasks")
    .insert({
      title: parsed.data.title,
      due_at: dueIso,
      lead_id: parsed.data.lead_id ?? null,
      assigned_to: parsed.data.assigned_to || user.id,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "tasks",
    entity_id: created.id,
    action: "task_created",
    diff: { title: parsed.data.title, lead_id: parsed.data.lead_id ?? null },
  });

  if (parsed.data.lead_id) {
    revalidatePath(`/admin/leads/${parsed.data.lead_id}`);
  }
  revalidatePath("/admin/today");
  revalidatePath("/admin");
  return { ok: true };
}

const ToggleInput = z.object({
  id: z.string().uuid(),
  done: z.enum(["0", "1"]),
});

export async function toggleTask(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = ToggleInput.safeParse({
    id: formData.get("id"),
    done: formData.get("done"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const done = parsed.data.done === "1";
  const supabase = await getServerSupabase();
  const { data: task, error } = await supabase
    .from("tasks")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", parsed.data.id)
    .select("lead_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "tasks",
    entity_id: parsed.data.id,
    action: done ? "task_completed" : "task_reopened",
  });

  if (task?.lead_id) revalidatePath(`/admin/leads/${task.lead_id}`);
  revalidatePath("/admin/today");
  revalidatePath("/admin");
  return { ok: true };
}

const DeleteInput = z.object({ id: z.string().uuid() });

export async function deleteTask(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = DeleteInput.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await getServerSupabase();
  const { data: task, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", parsed.data.id)
    .select("lead_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "tasks",
    entity_id: parsed.data.id,
    action: "task_deleted",
  });

  if (task?.lead_id) revalidatePath(`/admin/leads/${task.lead_id}`);
  revalidatePath("/admin/today");
  revalidatePath("/admin");
  return { ok: true };
}
