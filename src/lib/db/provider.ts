import type { SupabaseClient } from "@supabase/supabase-js";

import { createD1DataClient, type D1DataClient, type D1Like } from "./d1Client";

/**
 * Data provider switch (OPS-362, part 1 of OPS-353).
 *
 *   DATA_PROVIDER unset or anything but "d1"   Supabase Postgres. The clients
 *       the callers get are the exact objects supabase-js built; this file
 *       adds nothing in front of them. This is production and staging today.
 *   DATA_PROVIDER=d1   `.from()` and `.rpc()` go to the Worker's D1 binding
 *       DB through the ported client (./d1Client.ts, same query API). Every
 *       other property (`.auth`, `.storage`, ...) still goes to Supabase, which
 *       sign-in and file storage keep using until their own parts.
 *
 * What D1 mode does NOT have yet, so nothing may set it before the rest of
 * OPS-353 lands: row-level security (the 49 policies become server-side checks,
 * with a test per route, OPS-404), the policy helpers is_admin, is_owner and
 * is_editor (rpc() answers PGRST202), the seed rows and the data copy. The
 * other Postgres functions run in code (./d1Rpcs.ts, OPS-364). No wrangler config names a D1 database today, so with the variable
 * set but no binding every query comes back as an error, loudly.
 */
export type DataProvider = "supabase" | "d1";

export function dataProvider(): DataProvider {
  return process.env.DATA_PROVIDER === "d1" ? "d1" : "supabase";
}

async function d1Binding(): Promise<D1Like> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as unknown as { DB?: D1Like }).DB;
  if (!db) throw new Error("DATA_PROVIDER=d1 needs the D1 binding DB (see wrangler.jsonc).");
  return db;
}

let shared: D1DataClient | null = null;

export function getD1Data(): D1DataClient {
  shared ??= createD1DataClient(d1Binding);
  return shared;
}

/**
 * The client the callers use. With the default provider this returns what
 * `build()` returns, untouched. With "d1" it returns a lazy proxy: from/rpc to
 * D1, everything else to the Supabase client, which is built only when a
 * caller first touches it (so D1 mode needs no Supabase key to query).
 */
export function withDataProvider<T extends SupabaseClient>(build: () => T): T {
  if (dataProvider() !== "d1") return build();
  let supabase: T | null = null;
  return new Proxy({} as T, {
    get(_target, prop: string | symbol) {
      if (prop === "from" || prop === "rpc") {
        const d1 = getD1Data();
        return prop === "from" ? d1.from.bind(d1) : d1.rpc.bind(d1);
      }
      supabase ??= build();
      const value = (supabase as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(supabase) : value;
    },
  });
}
