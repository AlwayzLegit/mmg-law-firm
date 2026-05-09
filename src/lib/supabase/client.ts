"use client";

import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/**
 * Anon-key Supabase client for browser code. Respects RLS. Use this from
 * client components that need to read public-readable data after hydration.
 */
export function getBrowserSupabase() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
