import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { shapeWaiting, type WaitingLead } from "@/lib/data/daily-agenda";
import { SLA_TARGET_MINUTES } from "@/lib/leads/sla";

/**
 * Leads still in `new` past the first-response target that have not been
 * alerted yet. Oldest first. The caller marks them with `markSlaAlerted`
 * after the alert goes out so each lead alerts exactly once.
 */
export async function findBreachedLeads(
  supabase: SupabaseClient,
  now = Date.now(),
): Promise<WaitingLead[]> {
  const cutoff = new Date(now - SLA_TARGET_MINUTES * 60_000).toISOString();
  const { data, error } = await supabase
    .from("leads")
    .select("id, full_name, created_at, assigned_to")
    .eq("status", "new")
    .is("merged_into", null)
    .is("sla_alerted_at", null)
    .lte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(25);
  if (error) throw new Error(`sla-alerts query failed: ${error.message}`);
  return shapeWaiting(
    (data ?? []) as Array<{
      id: string;
      full_name: string | null;
      created_at: string;
      assigned_to: string | null;
    }>,
    now,
  );
}

export async function markSlaAlerted(
  supabase: SupabaseClient,
  ids: string[],
  now = Date.now(),
): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("leads")
    .update({ sla_alerted_at: new Date(now).toISOString() })
    .in("id", ids);
  if (error) throw new Error(`sla-alerts mark failed: ${error.message}`);
}
