import "server-only";

import { after } from "next/server";
import { z } from "zod";

import { authenticateApi, json, parseJsonBody } from "@/lib/api/auth";
import { logApiAudit } from "@/lib/api/blog";
import { notifyRunFinished } from "@/lib/content-agent/notify";
import { applyRunPatch, RUN_SELECT, settingsForRun, type RunRow } from "@/lib/content-agent/runs";
import { PatchRunInput } from "@/lib/content-agent/schemas";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Id = z.string().uuid();
type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/agent/runs/:id — one run with its questions. */
export async function GET(req: Request, ctx: Ctx): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:read"]);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return json(400, { error: "Invalid id." });

  const supabase = getServiceSupabase();
  const [{ data: run, error }, { data: questions }] = await Promise.all([
    supabase.from("agent_runs").select(RUN_SELECT).eq("id", id).maybeSingle(),
    supabase
      .from("agent_questions")
      .select("id, kind, question, context, status, answer, answered_at, topic_id, post_id, created_at")
      .eq("run_id", id)
      .order("created_at"),
  ]);
  if (error) return json(500, { error: error.message });
  if (!run) return json(404, { error: "Run not found." });
  return json(200, { run, questions: questions ?? [] });
}

/**
 * PATCH /api/admin/agent/runs/:id — heartbeat/progress (status omitted or
 * "running") or completion (succeeded | failed | needs_human) with the report.
 */
export async function PATCH(req: Request, ctx: Ctx): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:write"]);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return json(400, { error: "Invalid id." });

  const body = parseJsonBody(await req.text());
  if (!body.ok) return body.response;
  const parsed = PatchRunInput.safeParse(body.body);
  if (!parsed.success) {
    return json(422, { error: "Validation failed.", issues: parsed.error.flatten() });
  }
  const d = parsed.data;

  const supabase = getServiceSupabase();
  const { data: current, error } = await supabase
    .from("agent_runs")
    .select(RUN_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) return json(500, { error: error.message });
  if (!current) return json(404, { error: "Run not found." });
  const run = current as RunRow;
  if (run.status !== "running") {
    return json(409, { error: `Run is already ${run.status}.` });
  }

  let outcome;
  try {
    outcome = await applyRunPatch(supabase, run, d);
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : "Update failed." });
  }

  const terminal = outcome.run.status !== "running";
  await logApiAudit(
    supabase,
    {
      entity: "agent_runs",
      entity_id: id,
      action: terminal ? `run_${outcome.run.status}` : "run_progress",
      diff: {
        posts_created: outcome.run.posts_created.length,
        questions: outcome.questionsCreated,
        topics_requeued: outcome.topicsRequeued,
      },
    },
    auth.principal,
    id,
  );

  if (terminal) {
    const finished = outcome.run;
    const questionsCreated = outcome.questionsCreated;
    after(async () => {
      try {
        const settings = await settingsForRun(supabase, finished);
        const { count } = await supabase
          .from("blog_posts")
          .select("id", { count: "exact", head: true })
          .eq("review_status", "needs_review");
        await notifyRunFinished({
          settings,
          run: finished,
          questionsCreated,
          needsReviewCount: count ?? 0,
        });
      } catch (err) {
        console.warn("[content-agent] post-run notify:", err);
      }
    });
  }

  return json(200, {
    run: outcome.run,
    questions_created: outcome.questionsCreated,
    topics_requeued: outcome.topicsRequeued,
  });
}
