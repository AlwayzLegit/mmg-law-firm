import { beforeEach, describe, expect, it, vi } from "vitest";

// requireAdmin() on both providers (OPS-365): the same return shape and the
// same redirects, whichever sign-in system answers.

const redirect = vi.fn((to: string) => {
  throw new Error(`redirect:${to}`);
});
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

let sessionUser: { id: string; email: string | null } | null = null;
const signOut = vi.fn(async () => {});
vi.mock("@/lib/auth/session", () => ({ getSessionUser: async () => sessionUser, signOut: () => signOut() }));

let profile: Record<string, unknown> | null = null;
const readers = { service: 0, server: 0 };
function client(kind: "service" | "server") {
  return {
    from: () => {
      readers[kind] += 1;
      const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: profile, error: null }) };
      return q;
    },
  };
}
vi.mock("@/lib/supabase/admin", () => ({ getServiceSupabase: () => client("service") }));
vi.mock("@/lib/supabase/server", () => ({ getServerSupabase: async () => client("server"), isSupabaseConfigured: () => true }));

import { requireAdmin } from "@/lib/auth/require-admin";

const saved = process.env.AUTH_PROVIDER;

beforeEach(() => {
  redirect.mockClear();
  signOut.mockClear();
  readers.service = 0;
  readers.server = 0;
  sessionUser = { id: "u1", email: "owner@mmg.test" };
  profile = { user_id: "u1", role: "owner", full_name: "Owner", password_set: true };
  if (saved === undefined) delete process.env.AUTH_PROVIDER;
  else process.env.AUTH_PROVIDER = saved;
});

describe.each([["supabase", "server"], ["better-auth", "service"]] as const)("requireAdmin with %s", (provider, reader) => {
  beforeEach(() => {
    if (provider === "better-auth") process.env.AUTH_PROVIDER = "better-auth";
    else delete process.env.AUTH_PROVIDER;
  });

  it("returns { user: { id, email }, profile } for an admin", async () => {
    const res = await requireAdmin();
    expect(res).toEqual({ user: { id: "u1", email: "owner@mmg.test" }, profile });
    expect(readers[reader]).toBe(1);
  });

  it("redirects to /login without a session", async () => {
    sessionUser = null;
    await expect(requireAdmin()).rejects.toThrow("redirect:/login");
  });

  it("signs out and redirects a user with no admin_profiles row", async () => {
    profile = null;
    await expect(requireAdmin()).rejects.toThrow("redirect:/login?error=not-admin");
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("sends an admin with no password yet to /onboarding, unless asked not to", async () => {
    profile = { ...profile, password_set: false };
    await expect(requireAdmin()).rejects.toThrow("redirect:/onboarding");
    await expect(requireAdmin({ allowUnonboarded: true })).resolves.toMatchObject({ user: { id: "u1" } });
  });
});
