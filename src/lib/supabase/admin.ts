import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses RLS — use ONLY in route handlers
 * or server actions where the caller has been authenticated/authorized.
 *
 * Importing this file in a client component will fail at build time thanks
 * to the "server-only" guard above. Do not import it from a layout/page
 * either: keep it scoped to API routes and server actions.
 */
export function getServiceSupabase() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY is not configured. " +
        "Cannot create service-role client.",
    );
  }
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { "x-application": "mmg-lawfirm-server" },
      },
    },
  );
}
