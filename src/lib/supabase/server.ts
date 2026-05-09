import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

/**
 * Anon-key Supabase client for server components, route handlers, and server
 * actions. Respects RLS — i.e. unpublished rows are not visible.
 *
 * In Next.js 16, cookies() is async — we await it.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(values) {
          try {
            for (const { name, value, options } of values) {
              cookieStore.set(name, value, options as CookieOptions);
            }
          } catch {
            // The Supabase SSR helper may attempt to write cookies during
            // a server component render, where Next does not allow it. The
            // session refresh in src/proxy.ts is the canonical write path.
          }
        },
      },
    },
  );
}

/**
 * Build-time / static-prerender variant: no cookie store, no session.
 * Use this from generateStaticParams / generateMetadata where cookies()
 * is unavailable.
 */
export function getStaticSupabase() {
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    },
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
