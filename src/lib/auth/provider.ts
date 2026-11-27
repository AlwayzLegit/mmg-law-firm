/**
 * Which admin sign-in system is active (OPS-365, part 3 of OPS-353).
 *
 *   AUTH_PROVIDER unset or anything but "better-auth"   Supabase Auth. This is
 *       production and staging today; every caller goes through the same
 *       Supabase calls it always made.
 *   AUTH_PROVIDER=better-auth   Better Auth on the Worker's D1 binding `DB`
 *       (src/lib/auth/better.ts). It needs DATA_PROVIDER=d1 as well, because
 *       the admin gate reads admin_profiles from the same database. Nothing
 *       sets it until OPS-366 flips staging.
 *
 * Read on every call: on Workers, env vars are attached per request.
 */
export type AuthProviderName = "supabase" | "better-auth";

export function authProvider(): AuthProviderName {
  return process.env.AUTH_PROVIDER === "better-auth" ? "better-auth" : "supabase";
}
