"use server";

import { redirect } from "next/navigation";

import { signOut } from "@/lib/auth/session";

/**
 * Server-side sign-out. Running on the server (not the browser client) means
 * the session cookie writer clears the auth cookies for certain, then we
 * redirect to /login. This is more reliable than a client-only signOut, which
 * can leave the server-rendered session cookie in place. The session facade
 * ends the Supabase or the Better Auth session, whichever is active.
 */
export async function signOutAction() {
  await signOut();
  redirect("/login");
}
