import "server-only";

import { authenticateApi, clampInt, json, parseJsonBody } from "@/lib/api/auth";
import { logApiAudit } from "@/lib/api/blog";
import { withIdempotency } from "@/lib/api/idempotency";
import { loadBrief, toBriefTopic, TOPIC_SELECT, type BriefAnswer } from "@/lib/content-agent/brief";
import { getActiveInstructions } from "@/lib/content-agent/instructions";
import { RUN_SELECT, sweepStaleRuns } from "@/lib/content-agent/runs";
import { StartRunInput } from "@/lib/content-agent/schemas";
import { parseSettings } from "@/lib/content-agent/settings";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/agent/runs — list runs, newest first.
 * Query: status, limit (≤100, default 20), offset.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:read"]);
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const limit = clampInt(url.searchParams.get("limit"), 1, 100, 20);
  const offset = clampInt(url.searchParams.get("offset"), 0, 1e9, 0);
  const status = url.searchParams.get("status");

  const supabase = getServiceSupabase();
  let q = supabase
    .from("agent_runs")
    .select(RUN_SELECT, { count: "exact" })
    .order("started_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) q = q.eq("status", status);
  const { data, error, count } = await q;
  if (error) return json(500, { error: error.message });
  return json(200, { runs: data ?? [], count: count ?? 0, limit, offset });
}

/**
 * POST /api/admin/agent/runs — THE one call to start work.
 *
 *   1. sweep stale runs (release their topics)
 *   2. insert the run (pinned to the active instructions version)
 *   3. atomically claim N queued topics (or specific topic_ids)
 *   4. mark owner answers as delivered to this run
 *   5. return { run, brief }
 *
 * Idempotent with an Idempotency-Key header.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:write"]);
  if (!auth.ok) return auth.response;

  const raw = await req.text();
  return withIdempotency(req, auth.principal, raw, async () => {
    const body = parseJsonBody(raw);
    if (!body.ok) return body.response;
    const parsed = StartRunInput.safeParse(body.body);
    if (!parsed.success) {
      return json(422, { error: "Validation failed.", issues: parsed.error.flatten() });
    }
    const d = parsed.data;
    const supabase = getServiceSupabase();

    const instructions = await getActiveInstructions(supabase);
    const settings = instructions?.settings ?? parseSettings({});
    await sweepStaleRuns(supabase, settings.run_timeout_minutes);

    const { data: runRow, error: runErr } = await supabase
      .from("agent_runs")
      .insert({
        agent_name: d.agent_name,
        api_key_id: auth.principal.id,
        instructions_version: instructions?.version ?? null,
        meta: d.meta ?? null,
      })
      .select(RUN_SELECT)
      .single();
    if (runErr || !runRow) return json(500, { error: runErr?.message ?? "Could not create run." });
    const run = runRow as { id: string };

    // Claim topics.
    const wanted = d.topic_ids?.length ? d.topic_ids.length : (d.claim_topics ?? settings.posts_per_run);
    let claimedIds: string[] = [];
    if (wanted > 0) {
      const { data: claimed, error: claimErr } = await supabase.rpc("claim_content_topics", {
        p_run_id: run.id,
        p_limit: wanted,
        p_topic_ids: d.topic_ids?.length ? d.topic_ids : null,
      });
      if (claimErr) console.warn("[content-agent] claim failed:", claimErr.message);
      claimedIds = ((claimed ?? []) as Array<{ id: string }>).map((r) => r.id);
      if (claimedIds.length > 0) {
        await supabase.from("agent_runs").update({ topics_claimed: claimedIds }).eq("id", run.id);
      }
    }
    let claimedTopics: ReturnType<typeof toBriefTopic>[] = [];
    if (claimedIds.length > 0) {
      const { data } = await supabase.from("content_topics").select(TOPIC_SELECT).in("id", claimedIds);
      claimedTopics = ((data ?? []) as unknown as Parameters<typeof toBriefTopic>[0][]).map(toBriefTopic);
      const order = new Map(claimedIds.map((id, i) => [id, i]));
      claimedTopics.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }

    // Deliver answered questions to this run.
    const { data: answered } = await supabase
      .from("agent_questions")
      .select("id, run_id, created_at, kind, question, context, answer, answered_at, topic_id, post_id")
      .eq("status", "answered")
      .is("delivered_run_id", null)
      .order("answered_at")
      .limit(50);
    const answers: BriefAnswer[] = ((answered ?? []) as Array<Record<string, unknown>>).map((q) => ({
      question_id: q.id as string,
      asked_in_run_id: q.run_id as string,
      asked_at: q.created_at as string,
      kind: q.kind as string,
      question: q.question as string,
      context: (q.context as string | null) ?? null,
      answer: (q.answer as string) ?? "",
      answered_at: (q.answered_at as string | null) ?? null,
      topic_id: (q.topic_id as string | null) ?? null,
      post_id: (q.post_id as string | null) ?? null,
    }));
    if (answers.length > 0) {
      await supabase
        .from("agent_questions")
        .update({ delivered_run_id: run.id })
        .in("id", answers.map((a) => a.question_id));
    }

    await logApiAudit(
      supabase,
      {
        entity: "agent_runs",
        entity_id: run.id,
        action: "start",
        diff: { agent_name: d.agent_name, topics_claimed: claimedIds.length },
      },
      auth.principal,
      run.id,
    );

    const { data: fresh } = await supabase.from("agent_runs").select(RUN_SELECT).eq("id", run.id).single();
    const brief = d.include_brief
      ? await loadBrief(supabase, { principal: auth.principal, claimed: claimedTopics, answers })
      : null;
    return json(201, { run: fresh ?? runRow, brief });
  });
}
