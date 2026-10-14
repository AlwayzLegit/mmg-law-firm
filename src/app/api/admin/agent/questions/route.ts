import "server-only";

import { authenticateApi, clampInt, json, parseJsonBody } from "@/lib/api/auth";
import { StandaloneQuestionInput } from "@/lib/content-agent/schemas";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SELECT =
  "id, run_id, kind, question, context, status, answer, answered_at, delivered_run_id, topic_id, post_id, created_at";

/**
 * GET /api/admin/agent/questions — list. Query: status=open|answered|dismissed,
 * undelivered=1 (answered but not yet handed to a run), limit, offset.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:read"]);
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const supabase = getServiceSupabase();
  const limit = clampInt(url.searchParams.get("limit"), 1, 100, 50);
  const offset = clampInt(url.searchParams.get("offset"), 0, 1e9, 0);
  let q = supabase
    .from("agent_questions")
    .select(SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  const status = url.searchParams.get("status");
  if (status) q = q.eq("status", status);
  if (url.searchParams.get("undelivered") === "1") {
    q = q.eq("status", "answered").is("delivered_run_id", null);
  }
  const { data, error, count } = await q;
  if (error) return json(500, { error: error.message });
  return json(200, { questions: data ?? [], count: count ?? 0, limit, offset });
}

/** POST /api/admin/agent/questions — ask outside the PATCH-run flow. */
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:write"]);
  if (!auth.ok) return auth.response;
  const body = parseJsonBody(await req.text());
  if (!body.ok) return body.response;
  const parsed = StandaloneQuestionInput.safeParse(body.body);
  if (!parsed.success) {
    return json(422, { error: "Validation failed.", issues: parsed.error.flatten() });
  }
  const d = parsed.data;
  const supabase = getServiceSupabase();
  const { data: run } = await supabase.from("agent_runs").select("id").eq("id", d.run_id).maybeSingle();
  if (!run) return json(404, { error: "run_id not found." });
  const { data, error } = await supabase
    .from("agent_questions")
    .insert({
      run_id: d.run_id,
      kind: d.kind,
      question: d.question,
      context: d.context ?? null,
      topic_id: d.topic_id ?? null,
      post_id: d.post_id ?? null,
    })
    .select(SELECT)
    .single();
  if (error) return json(500, { error: error.message });
  return json(201, { question: data });
}
