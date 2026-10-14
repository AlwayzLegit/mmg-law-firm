"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const AnswerInput = z.object({
  id: z.string().uuid(),
  answer: z.string().trim().min(1, "Write an answer").max(4000),
});

/** Owner answers an agent question; the next run picks it up in `answers`. */
export async function answerAgentQuestion(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const parsed = AnswerInput.safeParse({ id: formData.get("id"), answer: formData.get("answer") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("agent_questions")
    .update({
      answer: parsed.data.answer,
      status: "answered",
      answered_by: user.id,
      answered_at: new Date().toISOString(),
      delivered_run_id: null,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };
  logAudit({ actor_id: user.id, entity: "agent_questions", entity_id: parsed.data.id, action: "answered" });
  revalidatePath("/admin/content/agent");
  revalidatePath("/admin");
  return { ok: true };
}

export async function dismissAgentQuestion(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid id" };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("agent_questions").update({ status: "dismissed" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  logAudit({ actor_id: user.id, entity: "agent_questions", entity_id: id, action: "dismissed" });
  revalidatePath("/admin/content/agent");
  revalidatePath("/admin");
  return { ok: true };
}

/** Mark a stuck run failed and release its topics (owner-only safety valve). */
export async function failStuckRun(formData: FormData): Promise<ActionResult> {
  const { user, profile } = await requireAdmin();
  if (profile.role !== "owner") return { ok: false, error: "Owner only." };
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid id" };
  const supabase = await getServerSupabase();
  const { data: run } = await supabase.from("agent_runs").select("status").eq("id", id).maybeSingle();
  if (!run) return { ok: false, error: "Run not found." };
  if ((run as { status: string }).status !== "running") return { ok: false, error: "Run is not running." };
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("agent_runs")
    .update({ status: "failed", error: "Marked failed by an admin", finished_at: now })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase
    .from("content_topics")
    .update({ status: "queued", claimed_by_run_id: null, claimed_at: null })
    .eq("claimed_by_run_id", id)
    .eq("status", "claimed");
  logAudit({ actor_id: user.id, entity: "agent_runs", entity_id: id, action: "run_failed", diff: { by: "admin" } });
  revalidatePath("/admin/content/agent");
  revalidatePath(`/admin/content/agent/runs/${id}`);
  return { ok: true };
}
