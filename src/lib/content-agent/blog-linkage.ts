import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ties API-created blog posts back to the content-agent run and topic that
 * produced them. All checks return a `{ ok:false, status, error }` shape so
 * the route can surface a precise HTTP error.
 */

export type LinkCheck = { ok: true } | { ok: false; status: number; error: string };

export async function assertRunRunning(
  supabase: SupabaseClient,
  runId: string,
): Promise<LinkCheck> {
  const { data, error } = await supabase
    .from("agent_runs")
    .select("id, status")
    .eq("id", runId)
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: false, status: 404, error: "run_id not found." };
  if ((data as { status: string }).status !== "running") {
    return { ok: false, status: 409, error: "run_id is not a running run." };
  }
  return { ok: true };
}

export async function assertTopicClaimable(
  supabase: SupabaseClient,
  topicId: string,
  runId: string | undefined,
): Promise<LinkCheck> {
  const { data, error } = await supabase
    .from("content_topics")
    .select("id, status, claimed_by_run_id, post_id")
    .eq("id", topicId)
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: false, status: 404, error: "topic_id not found." };
  const t = data as {
    status: string;
    claimed_by_run_id: string | null;
    post_id: string | null;
  };
  if (t.post_id) {
    return { ok: false, status: 409, error: "topic_id already has a post." };
  }
  if (t.status === "claimed" && runId && t.claimed_by_run_id !== runId) {
    return { ok: false, status: 409, error: "topic_id is claimed by another run." };
  }
  if (!["queued", "claimed"].includes(t.status)) {
    return { ok: false, status: 409, error: `topic_id is ${t.status}.` };
  }
  return { ok: true };
}

/** After a successful insert: record the post on the run and the topic. */
export async function linkPost(
  supabase: SupabaseClient,
  args: { postId: string; runId?: string; topicId?: string | null; published: boolean },
): Promise<void> {
  const { postId, runId, topicId, published } = args;
  try {
    if (runId) {
      const { data } = await supabase
        .from("agent_runs")
        .select("posts_created")
        .eq("id", runId)
        .maybeSingle();
      const prev = ((data as { posts_created?: string[] } | null)?.posts_created ?? []).filter(
        (id) => id !== postId,
      );
      await supabase
        .from("agent_runs")
        .update({ posts_created: [...prev, postId], heartbeat_at: new Date().toISOString() })
        .eq("id", runId);
    }
    if (topicId) {
      await supabase
        .from("content_topics")
        .update({ status: published ? "published" : "drafted", post_id: postId })
        .eq("id", topicId);
    }
  } catch (err) {
    console.warn("[content-agent] linkPost:", err);
  }
}

/** When a linked post is published later, promote its topic. */
export async function markTopicPublishedForPost(
  supabase: SupabaseClient,
  postId: string,
): Promise<void> {
  try {
    await supabase
      .from("content_topics")
      .update({ status: "published" })
      .eq("post_id", postId)
      .in("status", ["claimed", "drafted"]);
  } catch (err) {
    console.warn("[content-agent] markTopicPublished:", err);
  }
}
