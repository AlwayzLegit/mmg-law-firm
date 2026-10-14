"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AgentSettings } from "@/lib/content-agent/settings";
import { getServerSupabase } from "@/lib/supabase/server";

export type ActionResult = { ok: true; version?: number } | { ok: false; error: string };

const Input = z.object({
  body_md: z.string().min(50, "Instructions are too short.").max(32000),
  change_note: z.string().trim().max(300).optional(),
  settings_json: z.string(),
});

/** Publish a new instructions version (insert-only history). */
export async function publishInstructions(formData: FormData): Promise<ActionResult> {
  const { user, profile } = await requireAdmin();
  if (profile.role === "intake") return { ok: false, error: "Intake accounts can't edit agent instructions." };
  const parsed = Input.safeParse({
    body_md: formData.get("body_md"),
    change_note: formData.get("change_note") || undefined,
    settings_json: formData.get("settings_json"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let settingsRaw: unknown;
  try {
    settingsRaw = JSON.parse(parsed.data.settings_json);
  } catch {
    return { ok: false, error: "Settings are not valid JSON." };
  }
  const settings = AgentSettings.safeParse(settingsRaw);
  if (!settings.success) {
    const issue = settings.error.issues[0];
    return { ok: false, error: `Settings: ${issue?.path.join(".")} ${issue?.message}` };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("agent_instructions")
    .insert({
      body_md: parsed.data.body_md,
      settings: settings.data,
      change_note: parsed.data.change_note ?? null,
      created_by: user.id,
    })
    .select("id, version")
    .single();
  if (error) return { ok: false, error: error.message };
  const row = data as { id: string; version: number };
  logAudit({ actor_id: user.id, entity: "agent_instructions", entity_id: row.id, action: "publish", diff: { version: row.version } });
  revalidatePath("/admin/content/agent/instructions");
  revalidatePath("/admin/content/agent");
  return { ok: true, version: row.version };
}
