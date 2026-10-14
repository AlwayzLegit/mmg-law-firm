import "server-only";

import { authenticateApi, clampInt, json, parseJsonBody } from "@/lib/api/auth";
import { logApiAudit } from "@/lib/api/blog";
import { getActiveInstructions } from "@/lib/content-agent/instructions";
import { InstructionsPutInput } from "@/lib/content-agent/schemas";
import { AgentSettings, parseSettings } from "@/lib/content-agent/settings";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/agent/instructions — active version (or ?version=N). */
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:read"]);
  if (!auth.ok) return auth.response;
  const v = new URL(req.url).searchParams.get("version");
  const supabase = getServiceSupabase();
  const active = await getActiveInstructions(
    supabase,
    v ? clampInt(v, 1, 1e9, 0) || undefined : undefined,
  );
  if (!active) return json(404, { error: "No instructions found." });
  return json(200, { instructions: active });
}

/**
 * PUT /api/admin/agent/instructions — publish a new version. agent:admin only
 * (the daily agent key should not hold this scope). Settings are merged over
 * the current version's settings, then validated.
 */
export async function PUT(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:admin"]);
  if (!auth.ok) return auth.response;
  const body = parseJsonBody(await req.text());
  if (!body.ok) return body.response;
  const parsed = InstructionsPutInput.safeParse(body.body);
  if (!parsed.success) {
    return json(422, { error: "Validation failed.", issues: parsed.error.flatten() });
  }
  const supabase = getServiceSupabase();
  const current = await getActiveInstructions(supabase);
  const merged = AgentSettings.safeParse({
    ...(current?.settings ?? parseSettings({})),
    ...(parsed.data.settings ?? {}),
  });
  if (!merged.success) {
    return json(422, { error: "Invalid settings.", issues: merged.error.flatten() });
  }
  const { data, error } = await supabase
    .from("agent_instructions")
    .insert({
      body_md: parsed.data.body_md,
      settings: merged.data,
      change_note: parsed.data.change_note ?? null,
    })
    .select("id, version, body_md, settings, change_note, created_at")
    .single();
  if (error) return json(500, { error: error.message });
  await logApiAudit(
    supabase,
    { entity: "agent_instructions", entity_id: (data as { id: string }).id, action: "publish", diff: { version: (data as { version: number }).version } },
    auth.principal,
  );
  return json(201, { instructions: data });
}
