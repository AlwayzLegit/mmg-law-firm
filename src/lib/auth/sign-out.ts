"use server";

import { redirect } from "next/navigation";

import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Server-side sign-out. Running on the server (not the browser client) means
 * the Supabase SSR cookie writer clears the auth cookies for certain, then we
 * redirect to /login. This is more reliable than a client-only signOut, which
 * can leave the server-rendered session cookie in place.
 */
export async function signOutAction() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
