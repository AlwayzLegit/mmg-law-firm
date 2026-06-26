"use server";

import { redirect } from "next/navigation";

import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Server-side sign-out. Running on the server (not the browser client) means
 * the Supabase SSR cookie writer clears the auth cookies for certain, then we
 * redirect to /login. This is more reliable than a client-only signOut, which
 * can leave the server-rendered session cookie in place.
 *
 * The device-trust cookie is intentionally left alone — the device stays
 * remembered, so the next sign-in needs the password but not a fresh email
 * code (until the 30-day trust window lapses).
 */
export async function signOutAction() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
