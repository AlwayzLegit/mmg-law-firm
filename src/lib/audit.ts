import "server-only";

import { after } from "next/server";

import { getServiceSupabase } from "@/lib/supabase/admin";

type AuditEntry = {
  actor_id: string;
  entity: string;
  entity_id: string | null;
  action: string;
  diff?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

/**
 * Fire-and-forget audit log insert, deferred until after the response is
 * sent. Supabase's PostgrestBuilder is a lazy thenable: a bare
 * `void supabase.from("audit_log").insert(...)` never executes because
 * nothing awaits it. This helper actually awaits the insert (inside
 * after() so it doesn't block the user-facing action) and swallows
 * failures so audit gaps never break an admin flow.
 *
 * Writes go through the service-role client. `audit_log` has an admin
 * SELECT policy but no INSERT policy, so inserts with the signed-in user's
 * client were rejected by RLS and every admin action since launch went
 * unlogged (only API-key events, which already used the service role,
 * appeared). Callers pass `actor_id` from requireAdmin(), so the row is
 * still attributed to a verified admin. Only ever call this from server
 * actions and route handlers.
 */
export function logAudit(entry: AuditEntry): void {
  after(async () => {
    try {
      const supabase = getServiceSupabase();
      const { error } = await supabase.from("audit_log").insert(entry);
      if (error) console.warn("[audit_log]", error.message);
    } catch (err) {
      console.warn("[audit_log]", err);
    }
  });
}

/** Bulk variant of {@link logAudit} — used for batched admin actions. */
export function logAuditMany(entries: AuditEntry[]): void {
  if (entries.length === 0) return;
  after(async () => {
    try {
      const supabase = getServiceSupabase();
      const { error } = await supabase.from("audit_log").insert(entries);
      if (error) console.warn("[audit_log]", error.message);
    } catch (err) {
      console.warn("[audit_log]", err);
    }
  });
}
