import "server-only";

import { z } from "zod";

import { authenticateApi, json, parseJsonBody } from "@/lib/api/auth";
import { logApiAudit } from "@/lib/api/blog";
import { QuestionPatchInput } from "@/lib/content-agent/schemas";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Id = z.string().uuid();
type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/agent/questions/:id — answer or dismiss (agent:admin).
 * Lets an owner answer from Slack/n8n later without the admin UI.
 */
export async function PATCH(req: Request, ctx: Ctx): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return json(400, { error: "Invalid id." });
  const body = parseJsonBody(await req.text());
  if (!body.ok) return body.response;
  const parsed = QuestionPatchInput.safeParse(body.body);
  if (!parsed.success) {
    return json(422, { error: "Validation failed.", issues: parsed.error.flatten() });
  }
  const supabase = getServiceSupabase();
  const updates: Record<string, unknown> = parsed.data.answer
    ? { answer: parsed.data.answer, status: "answered", answered_at: new Date().toISOString(), delivered_run_id: null }
    : { status: "dismissed" };
  const { data, error } = await supabase
    .from("agent_questions")
    .update(updates)
    .eq("id", id)
    .select("id, run_id, kind, question, status, answer, answered_at")
    .maybeSingle();
  if (error) return json(500, { error: error.message });
  if (!data) return json(404, { error: "Question not found." });
  await logApiAudit(
    supabase,
    { entity: "agent_questions", entity_id: id, action: parsed.data.answer ? "answered" : "dismissed" },
    auth.principal,
  );
  return json(200, { question: data });
}
