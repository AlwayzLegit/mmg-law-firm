"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/require-admin";
import { TopicInput, TOPIC_STATUSES } from "@/lib/content-agent/schemas";
import { SEED_TOPICS } from "@/lib/content-agent/seed-topics";
import { parseTopicsText } from "@/lib/content-agent/topic-import";
import { insertTopics, resolveTopics } from "@/lib/content-agent/topics";
import { getServerSupabase } from "@/lib/supabase/server";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const PATH = "/admin/content/agent/topics";

function revalidate() {
  revalidatePath(PATH);
  revalidatePath("/admin/content/agent");
}

export async function createTopic(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const raw = {
    keyword: formData.get("keyword"),
    intent: formData.get("intent") || "informational",
    practice_area_slug: formData.get("practice_area_slug") || undefined,
    county_slug: formData.get("county_slug") || undefined,
    city_slug: formData.get("city_slug") || undefined,
    target_url: formData.get("target_url") || undefined,
    priority: formData.get("priority") ? Number(formData.get("priority")) : undefined,
    notes: formData.get("notes") || undefined,
  };
  const parsed = TopicInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await getServerSupabase();
  const { rows, failed } = await resolveTopics(supabase, [parsed.data], { source: "manual", priority: 50, createdBy: user.id });
  if (failed.length) return { ok: false, error: failed[0].reason };
  const out = await insertTopics(supabase, rows, { upsert: false, select: "id" });
  if (out.skipped.length) return { ok: false, error: `Skipped: ${out.skipped[0].reason}` };
  logAudit({ actor_id: user.id, entity: "content_topics", entity_id: (out.inserted[0]?.id as string) ?? null, action: "create" });
  revalidate();
  return { ok: true };
}

const UpdateInput = z.object({
  id: z.string().uuid(),
  priority: z.coerce.number().int().min(0).max(1000).optional(),
  status: z.enum(TOPIC_STATUSES).optional(),
  notes: z.string().trim().max(2000).optional(),
  target_url: z.string().trim().max(300).optional(),
});

export async function updateTopic(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const parsed = UpdateInput.safeParse({
    id: formData.get("id"),
    priority: formData.get("priority") || undefined,
    status: formData.get("status") || undefined,
    notes: formData.get("notes") ?? undefined,
    target_url: formData.get("target_url") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { id, ...rest } = parsed.data;
  const updates: Record<string, unknown> = {};
  if (rest.priority !== undefined) updates.priority = rest.priority;
  if (rest.notes !== undefined) updates.notes = rest.notes || null;
  if (rest.target_url !== undefined) updates.target_url = rest.target_url || null;
  if (rest.status) {
    updates.status = rest.status;
    if (rest.status === "queued") {
      updates.claimed_by_run_id = null;
      updates.claimed_at = null;
    }
  }
  if (Object.keys(updates).length === 0) return { ok: false, error: "Nothing to update." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("content_topics").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  logAudit({ actor_id: user.id, entity: "content_topics", entity_id: id, action: "edit", diff: { fields: Object.keys(updates) } });
  revalidate();
  return { ok: true };
}

export async function deleteTopic(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid id" };
  const supabase = await getServerSupabase();
  const { data } = await supabase.from("content_topics").select("status, post_id").eq("id", id).maybeSingle();
  if (!data) return { ok: false, error: "Not found." };
  if ((data as { post_id: string | null }).post_id) return { ok: false, error: "This topic has a post; reject the post or mark the topic skipped instead." };
  const { error } = await supabase.from("content_topics").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  logAudit({ actor_id: user.id, entity: "content_topics", entity_id: id, action: "delete" });
  revalidate();
  return { ok: true };
}

/** Paste-import: markdown table (seo-keyword-targets layout) or CSV. */
export async function importTopics(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const text = String(formData.get("text") ?? "");
  const upsert = formData.get("upsert") === "on";
  if (!text.trim()) return { ok: false, error: "Paste a markdown table or CSV first." };
  const { topics, errors } = parseTopicsText(text);
  if (topics.length === 0) return { ok: false, error: errors[0] ?? "No topics found." };
  const validated = topics
    .map((t) => TopicInput.safeParse({ ...t, intent: t.intent ?? "informational" }))
    .filter((r) => r.success)
    .map((r) => r.data);
  const supabase = await getServerSupabase();
  const { rows, failed } = await resolveTopics(supabase, validated, { source: "import", priority: 50, createdBy: user.id });
  const out = await insertTopics(supabase, rows, { upsert, select: "id" });
  logAudit({
    actor_id: user.id,
    entity: "content_topics",
    entity_id: null,
    action: "topics_added",
    diff: { inserted: out.inserted.length, updated: out.updated.length, skipped: out.skipped.length + failed.length },
  });
  revalidate();
  const problems = [...errors, ...failed.map((f) => `${f.keyword}: ${f.reason}`), ...out.skipped.map((s) => `${s.keyword}: ${s.reason}`)];
  return {
    ok: true,
    message: `Imported ${out.inserted.length}, updated ${out.updated.length}, skipped ${out.skipped.length + failed.length}.${problems.length ? ` ${problems.slice(0, 3).join(" · ")}` : ""}`,
  };
}

/** Load the default Tier 1/2 queue from docs/seo-keyword-targets.md. Re-runnable. */
export async function seedDefaultTopics(): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const supabase = await getServerSupabase();
  const { rows, failed } = await resolveTopics(supabase, SEED_TOPICS, { source: "seed", priority: 50, createdBy: user.id });
  const out = await insertTopics(supabase, rows, { upsert: false, select: "id" });
  logAudit({
    actor_id: user.id,
    entity: "content_topics",
    entity_id: null,
    action: "topics_added",
    diff: { source: "seed", inserted: out.inserted.length, skipped: out.skipped.length + failed.length },
  });
  revalidate();
  return {
    ok: true,
    message: `Seeded ${out.inserted.length} topic${out.inserted.length === 1 ? "" : "s"}; ${out.skipped.length + failed.length} already present or unresolved.${
      failed.length ? ` (${failed.map((f) => f.reason).join("; ")})` : ""
    }`,
  };
}
