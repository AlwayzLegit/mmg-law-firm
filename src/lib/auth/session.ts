import "server-only";

import { headers as nextHeaders } from "next/headers";

import { authProvider } from "@/lib/auth/provider";
import { issueLink, type LinkType } from "@/lib/auth/links";
import { siteUrl } from "@/lib/seo/canonical";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * The one place the admin session is read and changed (OPS-365, part 3 of
 * OPS-353). Two providers sit behind it (src/lib/auth/provider.ts):
 *
 *   supabase (default)   the calls the callers made before, unchanged.
 *   better-auth          Better Auth on D1 (src/lib/auth/better.ts).
 *
 * Callers never import @supabase or better-auth for a session; link
 * generation for the Supabase path stays where it was (login-actions.ts,
 * settings/actions.ts) and calls the createBetter* functions below only on the
 * better-auth path.
 */

export type SessionUser = { id: string; email: string | null };

async function better() {
  const { getBetterAuth } = await import("@/lib/auth/better");
  return getBetterAuth();
}

/** The signed-in user, checked against the database (a revoked session is refused). */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (authProvider() === "better-auth") {
    const { auth } = await better();
    const res = await auth.api.getSession({ headers: await nextHeaders(), query: { disableCookieCache: true } });
    return res ? { id: res.user.id, email: res.user.email ?? null } : null;
  }
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? null } : null;
}

/**
 * For src/proxy.ts: the user behind these request headers. With Better Auth
 * the signed session cookie is trusted for a few minutes (no database read);
 * requireAdmin() re-checks against the database on every admin render.
 */
export async function getSessionUserFromHeaders(headers: Headers): Promise<SessionUser | null> {
  const { auth } = await better();
  const res = await auth.api.getSession({ headers });
  return res ? { id: res.user.id, email: res.user.email ?? null } : null;
}

export type SignInResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "bad-credentials" | "not-authorized" | "rate-limited" };

/** Email and password sign-in on the Better Auth path. The Supabase path is inline in login-actions.ts. */
export async function signInWithBetterAuth(email: string, password: string): Promise<SignInResult> {
  const { auth } = await better();
  // Loaded here, not at the top, so the default (Supabase) path never bundles Better Auth.
  const { APIError } = await import("better-auth/api");
  try {
    const res = await auth.api.signInEmail({ body: { email, password }, headers: await nextHeaders() });
    return { ok: true, userId: res.user.id };
  } catch (e) {
    if (e instanceof APIError) {
      if (e.status === "TOO_MANY_REQUESTS" || e.statusCode === 429) return { ok: false, reason: "rate-limited" };
      // The password was right but the session hook refused: no admin_profiles row, or banned.
      if (e.body?.code === "FAILED_TO_CREATE_SESSION") return { ok: false, reason: "not-authorized" };
    }
    return { ok: false, reason: "bad-credentials" };
  }
}

/** End this browser's session. */
export async function signOut(): Promise<void> {
  if (authProvider() === "better-auth") {
    const { auth } = await better();
    try {
      await auth.api.signOut({ headers: await nextHeaders() });
    } catch {
      // Already signed out: nothing to end.
    }
    return;
  }
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
}

/** End every session of the signed-in user (the end of a password reset). */
export async function signOutEverywhere(): Promise<void> {
  if (authProvider() === "better-auth") {
    // setOwnPassword already ended the others; this ends the new one too.
    await signOut();
    return;
  }
  const supabase = await getServerSupabase();
  await supabase.auth.signOut({ scope: "global" });
}

/** End every session of the signed-in user except this browser's. */
export async function signOutOtherSessions(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (authProvider() === "better-auth") {
    const { auth } = await better();
    try {
      await auth.api.signOutOthers({ headers: await nextHeaders() });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Couldn't sign out other devices." };
    }
  }
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Set the signed-in user's password. Better Auth also ends every other session and rotates this one. */
export async function setOwnPassword(password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (authProvider() === "better-auth") {
    const { auth } = await better();
    try {
      await auth.api.setOwnPassword({ body: { password }, headers: await nextHeaders() });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Couldn't save the password." };
    }
  }
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.updateUser({ password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Redeem an invite, magic or recovery link and open the session (Better Auth path of /auth/callback). */
export async function verifyBetterLink(token: string, type: LinkType): Promise<boolean> {
  const { auth } = await better();
  try {
    await auth.api.verifyLink({ body: { token, type }, headers: await nextHeaders() });
    return true;
  } catch {
    return false;
  }
}

/** The email of a user by id (the pending-invitee lookup in settings). */
export async function getAuthUserEmail(userId: string): Promise<string | null> {
  if (authProvider() === "better-auth") {
    const { db } = await better();
    const { results } = await db.prepare("SELECT email FROM auth_users WHERE id = ?").bind(userId).all<{ email: string }>();
    return results[0]?.email ?? null;
  }
  const { getServiceSupabase } = await import("@/lib/supabase/admin");
  const { data, error } = await getServiceSupabase().auth.admin.getUserById(userId);
  return error ? null : (data?.user?.email ?? null);
}

function callbackUrl(token: string, type: LinkType, next: string): string {
  return `${siteUrl()}/auth/callback?token=${encodeURIComponent(token)}&type=${type}&next=${encodeURIComponent(next)}`;
}

/**
 * An invite link for an email: a new user gets an `invite` link, an existing
 * one a `magiclink` (the Supabase path does the same: invite, then magiclink).
 */
export async function createBetterInviteLink(
  email: string,
  name: string,
): Promise<{ ok: true; userId: string; url: string; created: boolean } | { ok: false; error: string }> {
  try {
    const { auth, db } = await better();
    const found = await db.prepare("SELECT id FROM auth_users WHERE email = ?").bind(email.toLowerCase()).all<{ id: string }>();
    let userId = found.results[0]?.id;
    const created = !userId;
    if (!userId) {
      const ctx = await auth.$context;
      const user = await ctx.internalAdapter.createUser({ email, name, emailVerified: true }, { method: "admin" });
      userId = user.id;
    }
    const type: LinkType = created ? "invite" : "magiclink";
    const { token } = await issueLink(db, { userId, type });
    return { ok: true, userId, url: callbackUrl(token, type, "/onboarding"), created };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't create invite." };
  }
}

/** A recovery link for an admin's email, or null when the address is not an admin. */
export async function createBetterRecoveryLink(email: string): Promise<string | null> {
  const { db } = await better();
  const { results } = await db
    .prepare("SELECT u.id AS id FROM auth_users u JOIN admin_profiles p ON p.user_id = u.id WHERE u.email = ?")
    .bind(email.toLowerCase())
    .all<{ id: string }>();
  const userId = results[0]?.id;
  if (!userId) return null;
  const { token } = await issueLink(db, { userId, type: "recovery" });
  return callbackUrl(token, "recovery", "/reset-password");
}
