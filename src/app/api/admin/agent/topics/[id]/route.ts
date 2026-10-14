import "server-only";

import { z } from "zod";

import { authenticateApi, json, parseJsonBody } from "@/lib/api/auth";
import { logApiAudit } from "@/lib/api/blog";
import { hasScope } from "@/lib/api/scopes";
import { TOPIC_SELECT } from "@/lib/content-agent/brief";
import { TopicPatchInput } from "@/lib/content-agent/schemas";
import { resolveTopics } from "@/lib/content-agent/topics";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Id = z.string().uuid();
type Ctx = { params: Promise<{ id: string }> };
const FULL = `${TOPIC_SELECT}, source, post_id, claimed_by_run_id, claimed_at, created_at, updated_at`;

export async function GET(req: Request, ctx: Ctx): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:read"]);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return json(400, { error: "Invalid id." });
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from("content_topics").select(FULL).eq("id", id).maybeSingle();
  if (error) return json(500, { error: error.message });
  if (!data) return json(404, { error: "Topic not found." });
  return json(200, { topic: data });
}

/**
 * PATCH /api/admin/agent/topics/:id — edit fields and/or status. An agent may
 * set `skipped` (with a note) or `queued`; `rejected`/`published`/`drafted`
 * by hand need agent:admin.
 */
export async function PATCH(req: Request, ctx: Ctx): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:write"]);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return json(400, { error: "Invalid id." });

  const body = parseJsonBody(await req.text());
  if (!body.ok) return body.response;
  const parsed = TopicPatchInput.safeParse(body.body);
  if (!parsed.success) {
    return json(422, { error: "Validation failed.", issues: parsed.error.flatten() });
  }
  const d = parsed.data;
  const supabase = getServiceSupabase();

  const { data: current } = await supabase
    .from("content_topics")
    .select("id, status, keyword")
    .eq("id", id)
    .maybeSingle();
  if (!current) return json(404, { error: "Topic not found." });

  const updates: Record<string, unknown> = {};
  const { status, note, ...fields } = d;
  if (Object.keys(fields).length > 0) {
    const { rows, failed } = await resolveTopics(
      supabase,
      [{ keyword: (fields.keyword ?? (current as { keyword: string }).keyword), intent: fields.intent ?? "informational", ...fields }],
      { source: "manual", priority: 50, createdBy: null },
    );
    if (failed.length > 0) return json(422, { error: failed[0].reason });
    const r = rows[0];
    for (const k of Object.keys(fields) as Array<keyof typeof fields>) {
      switch (k) {
        case "practice_area_slug": updates.practice_area_id = r.practice_area_id; break;
        case "county_slug": updates.county_id = r.county_id; break;
        case "city_slug": updates.city_id = r.city_id; break;
        default: updates[k] = (r as Record<string, unknown>)[k] ?? (fields as Record<string, unknown>)[k];
      }
    }
  }
  if (note) updates.notes = note;
  if (status) {
    const privileged = ["rejected", "published", "drafted", "claimed"];
    if (privileged.includes(status) && !hasScope(auth.principal.scopes, "agent:admin")) {
      return json(403, { error: `Setting status=${status} requires agent:admin.`, required: ["agent:admin"] });
    }
    updates.status = status;
    if (status === "queued") {
      updates.claimed_by_run_id = null;
      updates.claimed_at = null;
    }
  }
  if (Object.keys(updates).length === 0) return json(400, { error: "No updatable fields supplied." });

  const { data, error } = await supabase
    .from("content_topics")
    .update(updates)
    .eq("id", id)
    .select(FULL)
    .single();
  if (error) return json(error.code === "23505" ? 409 : 500, { error: error.message });

  await logApiAudit(
    supabase,
    { entity: "content_topics", entity_id: id, action: "edit", diff: { fields: Object.keys(updates) } },
    auth.principal,
  );
  return json(200, { topic: data });
}
