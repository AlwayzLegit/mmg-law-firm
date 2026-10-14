import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateToken } from "./api-keys";

// --- mocks -----------------------------------------------------------------
// vi.mock factories are hoisted, so shared state lives in vi.hoisted().
const { envState, rateLimit, keyRows, updates } = vi.hoisted(() => ({
  envState: {
    ADMIN_API_KEY: "",
    NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "service",
  } as Record<string, string>,
  rateLimit: vi.fn<
    (key: string, limit: number) => Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }>
  >(async () => ({ allowed: true })),
  keyRows: [] as Record<string, unknown>[],
  updates: [] as unknown[],
}));
vi.mock("@/lib/env", () => ({ env: envState }));
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: () => Boolean(envState.NEXT_PUBLIC_SUPABASE_URL),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (key: string, limit: number) => rateLimit(key, limit),
}));
vi.mock("@/lib/supabase/admin", () => ({
  getServiceSupabase: () => ({
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const builder = {
        select() {
          return builder;
        },
        eq(col: string, v: unknown) {
          filters[col] = v;
          return builder;
        },
        update(patch: unknown) {
          updates.push({ table, patch });
          return builder;
        },
        maybeSingle: async () => ({
          data: keyRows.find((r) => r.prefix === filters.prefix) ?? null,
          error: null,
        }),
        then(resolve: (v: unknown) => void) {
          resolve({ data: null, error: null });
        },
      };
      return builder;
    },
  }),
}));

import { authenticateApi } from "./auth";

function req(token?: string): Request {
  return new Request("https://mmg-lawfirm.com/api/admin/blog", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

beforeEach(() => {
  keyRows.length = 0;
  updates.length = 0;
  envState.ADMIN_API_KEY = "";
  envState.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  envState.SUPABASE_SERVICE_ROLE_KEY = "service";
  rateLimit.mockClear();
  rateLimit.mockResolvedValue({ allowed: true });
});

describe("authenticateApi", () => {
  it("503 when neither env key nor table lookup is possible", async () => {
    envState.NEXT_PUBLIC_SUPABASE_URL = "";
    const r = await authenticateApi(req("anything"), []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(503);
  });

  it("401 without a bearer token", async () => {
    envState.ADMIN_API_KEY = "secret";
    const r = await authenticateApi(req(), []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });

  it("legacy env key → principal with * scope", async () => {
    envState.ADMIN_API_KEY = "secret-123";
    const r = await authenticateApi(req("secret-123"), ["agent:admin"]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.principal.kind).toBe("legacy");
      expect(r.principal.scopes.has("*")).toBe(true);
    }
    expect(rateLimit).toHaveBeenCalledWith("api:legacy", 600);
  });

  it("wrong legacy key → 401", async () => {
    envState.ADMIN_API_KEY = "secret-123";
    const r = await authenticateApi(req("secret-124"), []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });

  it("table key: valid, scoped, rate-limited by id, touches last_used_at", async () => {
    const t = generateToken();
    keyRows.push({
      id: "k1",
      name: "daily agent",
      prefix: t.prefix,
      key_hash: t.hash,
      scopes: ["blog:read", "agent:write"],
      rate_limit_per_hour: 100,
      expires_at: null,
      revoked_at: null,
      last_used_at: null,
    });
    const r = await authenticateApi(req(t.token), ["agent:write"]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.principal.id).toBe("k1");
      expect(r.principal.name).toBe("daily agent");
      expect(r.principal.rateLimitPerHour).toBe(100);
    }
    expect(rateLimit).toHaveBeenCalledWith("api:k1", 100);
    expect(updates.some((u) => (u as { table: string }).table === "api_keys")).toBe(true);
  });

  it("table key: missing scope → 403 listing what is missing", async () => {
    const t = generateToken();
    keyRows.push({ id: "k1", name: "n", prefix: t.prefix, key_hash: t.hash, scopes: ["blog:read"], rate_limit_per_hour: 600, expires_at: null, revoked_at: null, last_used_at: null });
    const r = await authenticateApi(req(t.token), ["blog:write", "blog:publish"]);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(403);
      const body = await r.response.json();
      expect(body.required).toEqual(["blog:write", "blog:publish"]);
    }
  });

  it("table key: revoked or expired → 401", async () => {
    const a = generateToken();
    const b = generateToken();
    keyRows.push({ id: "a", name: "a", prefix: a.prefix, key_hash: a.hash, scopes: ["*"], rate_limit_per_hour: 600, expires_at: null, revoked_at: "2026-01-01T00:00:00Z", last_used_at: null });
    keyRows.push({ id: "b", name: "b", prefix: b.prefix, key_hash: b.hash, scopes: ["*"], rate_limit_per_hour: 600, expires_at: "2020-01-01T00:00:00Z", revoked_at: null, last_used_at: null });
    for (const t of [a, b]) {
      const r = await authenticateApi(req(t.token), []);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.response.status).toBe(401);
    }
  });

  it("table key: wrong secret with a real prefix → 401", async () => {
    const t = generateToken();
    keyRows.push({ id: "k1", name: "n", prefix: t.prefix, key_hash: t.hash, scopes: ["*"], rate_limit_per_hour: 600, expires_at: null, revoked_at: null, last_used_at: null });
    const forged = `mmg_${t.prefix}_${"x".repeat(43)}`;
    const r = await authenticateApi(req(forged), []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });

  it("429 when the rate limiter says no", async () => {
    envState.ADMIN_API_KEY = "secret";
    rateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 42 });
    const r = await authenticateApi(req("secret"), []);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(429);
      expect(r.response.headers.get("retry-after")).toBe("42");
    }
  });
});
