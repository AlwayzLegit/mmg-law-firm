import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { parseSettings } from "./settings";
import type { PatchRunData } from "./schemas";

/**
 * Run lifecycle helpers: stale-run sweep, terminal completion bookkeeping.
 * Kept out of the route handlers so they can be unit-tested with a fake client.
 */

export const RUN_SELECT =
  "id, agent_name, api_key_id, status, started_at, heartbeat_at, finished_at, instructions_version, summary_md, report, metrics, log, posts_created, topics_claimed, topics_consumed, error, meta";

export type RunRow = {
  id: string;
  agent_name: string;
  api_key_id: string | null;
  status: "running" | "succeeded" | "failed" | "needs_human";
  started_at: string;
  heartbeat_at: string;
  finished_at: string | null;
  instructions_version: number | null;
  summary_md: string | null;
  report: Record<string, unknown>;
  metrics: Record<string, number>;
  log: Array<{ ts: string; msg: string }>;
  posts_created: string[];
  topics_claimed: string[];
  topics_consumed: string[];
  error: string | null;
  meta: Record<string, unknown> | null;
};

/**
 * Runs whose heartbeat is older than the configured timeout are marked failed
 * and their claimed topics are released. Returns the number swept.
 */
export async function sweepStaleRuns(
  supabase: SupabaseClient,
  timeoutMinutes: number,
): Promise<number> {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60_000).toISOString();
  const { data } = await supabase
    .from("agent_runs")
    .select("id")
    .eq("status", "running")
    .lt("heartbeat_at", cutoff);
  const stale = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  if (stale.length === 0) return 0;
  await supabase
    .from("agent_runs")
    .update({
      status: "failed",
      error: `timeout: no heartbeat for ${timeoutMinutes} minutes`,
      finished_at: new Date().toISOString(),
    })
    .in("id", stale);
  await supabase
    .from("content_topics")
    .update({ status: "queued", claimed_by_run_id: null, claimed_at: null })
    .in("claimed_by_run_id", stale)
    .eq("status", "claimed");
  return stale.length;
}

export type CompleteOutcome = {
  run: RunRow;
  questionsCreated: number;
  topicsRequeued: number;
};

/**
 * Apply a PATCH payload to a run. Non-terminal (status omitted or "running")
 * = heartbeat + log append. Terminal = finish, reconcile topics, create
 * questions. Unmentioned claimed topics go back to `queued` so nothing leaks.
 */
export async function applyRunPatch(
  supabase: SupabaseClient,
  run: RunRow,
  d: PatchRunData,
): Promise<CompleteOutcome> {
  const nowIso = new Date().toISOString();
  const terminal = d.status !== undefined && d.status !== "running";

  const logEntries = [...(run.log ?? [])];
  for (const msg of d.log ?? []) logEntries.push({ ts: nowIso, msg });
  const trimmedLog = logEntries.slice(-200);

  const update: Record<string, unknown> = { heartbeat_at: nowIso, log: trimmedLog };
  if (d.summary_md !== undefined) update.summary_md = d.summary_md;
  if (d.report !== undefined) update.report = d.report;
  if (d.metrics !== undefined) update.metrics = { ...(run.metrics ?? {}), ...d.metrics };
  if (d.error !== undefined) update.error = d.error;
  if (d.posts_created !== undefined) {
    update.posts_created = [...new Set([...(run.posts_created ?? []), ...d.posts_created])];
  }

  // Topic reconciliation (allowed on any PATCH, enforced on terminal).
  const consumed = new Set(run.topics_consumed ?? []);
  const mentioned = new Set<string>();
  for (const t of d.topics ?? []) {
    mentioned.add(t.id);
    const patch: Record<string, unknown> = { status: t.status };
    if (t.post_id !== undefined) patch.post_id = t.post_id;
    if (t.note) patch.notes = t.note;
    if (t.status === "queued") {
      patch.claimed_by_run_id = null;
      patch.claimed_at = null;
    } else {
      consumed.add(t.id);
    }
    await supabase
      .from("content_topics")
      .update(patch)
      .eq("id", t.id)
      .eq("claimed_by_run_id", run.id);
  }

  let topicsRequeued = 0;
  if (terminal) {
    update.status = d.status;
    update.finished_at = nowIso;
    const leftover = (run.topics_claimed ?? []).filter(
      (id) => !mentioned.has(id) && !consumed.has(id),
    );
    if (leftover.length > 0) {
      // Topics that got a post (via POST blog linkage) are consumed; the rest requeue.
      const { data: withPosts } = await supabase
        .from("content_topics")
        .select("id, post_id")
        .in("id", leftover);
      const hasPost = new Set(
        ((withPosts ?? []) as Array<{ id: string; post_id: string | null }>)
          .filter((r) => r.post_id)
          .map((r) => r.id),
      );
      const requeue = leftover.filter((id) => !hasPost.has(id));
      for (const id of leftover) if (hasPost.has(id)) consumed.add(id);
      if (requeue.length > 0) {
        await supabase
          .from("content_topics")
          .update({ status: "queued", claimed_by_run_id: null, claimed_at: null })
          .in("id", requeue)
          .eq("status", "claimed");
        topicsRequeued = requeue.length;
      }
    }
    update.topics_consumed = [...consumed];
  }

  let questionsCreated = 0;
  if (d.questions && d.questions.length > 0) {
    const { error } = await supabase.from("agent_questions").insert(
      d.questions.map((q) => ({
        run_id: run.id,
        kind: q.kind,
        question: q.question,
        context: q.context ?? null,
        topic_id: q.topic_id ?? null,
        post_id: q.post_id ?? null,
      })),
    );
    if (!error) questionsCreated = d.questions.length;
    else console.warn("[content-agent] questions insert:", error.message);
    if (terminal && d.status === "succeeded" && questionsCreated > 0) {
      update.status = "needs_human";
    }
  }

  const { data, error } = await supabase
    .from("agent_runs")
    .update(update)
    .eq("id", run.id)
    .select(RUN_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return { run: data as RunRow, questionsCreated, topicsRequeued };
}

/** Settings for a run: its pinned instructions version, else the active one. */
export async function settingsForRun(supabase: SupabaseClient, run: RunRow) {
  const q = supabase.from("agent_instructions").select("settings");
  const { data } = run.instructions_version
    ? await q.eq("version", run.instructions_version).maybeSingle()
    : await q.order("version", { ascending: false }).limit(1).maybeSingle();
  return parseSettings((data as { settings?: unknown } | null)?.settings);
}
