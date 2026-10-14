import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { parseSettings, type AgentSettings } from "./settings";

export type InstructionsRow = {
  id: string;
  version: number;
  body_md: string;
  settings: unknown;
  change_note: string | null;
  created_by: string | null;
  created_at: string;
};

export type ActiveInstructions = {
  version: number;
  body_md: string;
  settings: AgentSettings;
  created_at: string;
};

const SELECT = "id, version, body_md, settings, change_note, created_by, created_at";

/** The highest-version instructions row, with parsed settings. */
export async function getActiveInstructions(
  supabase: SupabaseClient,
  version?: number,
): Promise<ActiveInstructions | null> {
  let q = supabase.from("agent_instructions").select(SELECT);
  q = version ? q.eq("version", version) : q.order("version", { ascending: false });
  const { data, error } = await q.limit(1).maybeSingle();
  if (error) {
    console.warn("[content-agent] instructions:", error.message);
    return null;
  }
  const row = data as InstructionsRow | null;
  if (!row) return null;
  return {
    version: row.version,
    body_md: row.body_md,
    settings: parseSettings(row.settings),
    created_at: row.created_at,
  };
}

/** Settings only, with defaults when nothing is stored yet. */
export async function getActiveSettings(
  supabase: SupabaseClient,
): Promise<AgentSettings> {
  const active = await getActiveInstructions(supabase);
  return active?.settings ?? parseSettings({});
}
