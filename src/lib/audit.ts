import { after } from "next/server";

import { getServerSupabase } from "@/lib/supabase/server";

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
 */
export function logAudit(entry: AuditEntry): void {
  after(async () => {
    try {
      const supabase = await getServerSupabase();
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
      const supabase = await getServerSupabase();
      const { error } = await supabase.from("audit_log").insert(entries);
      if (error) console.warn("[audit_log]", error.message);
    } catch (err) {
      console.warn("[audit_log]", err);
    }
  });
}
