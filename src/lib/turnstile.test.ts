import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mutable env mock so each test can set the secret / NODE_ENV it needs.
vi.mock("@/lib/env", () => ({
  env: { TURNSTILE_SECRET_KEY: "", NODE_ENV: "test" },
}));

import { env } from "@/lib/env";
import { verifyTurnstile } from "./turnstile";

const mutableEnv = env as unknown as {
  TURNSTILE_SECRET_KEY: string;
  NODE_ENV: string;
};

function cfResponse(
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  mutableEnv.TURNSTILE_SECRET_KEY = "";
  mutableEnv.NODE_ENV = "test";
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyTurnstile — missing secret", () => {
  it("bypasses (accepts) outside production, without calling Cloudflare", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await verifyTurnstile("any-token");
    expect(result.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects in production", async () => {
    mutableEnv.NODE_ENV = "production";
    const result = await verifyTurnstile("any-token");
    expect(result).toEqual({ ok: false, reason: "turnstile-secret-missing" });
  });
});

describe("verifyTurnstile — with a secret", () => {
  beforeEach(() => {
    mutableEnv.TURNSTILE_SECRET_KEY = "secret-key";
  });

  it("rejects an empty token before hitting the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await verifyTurnstile("");
    expect(result).toEqual({ ok: false, reason: "missing-token" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts when Cloudflare returns success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(cfResponse({ success: true }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await verifyTurnstile("good-token", "1.2.3.4");
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain("challenges.cloudflare.com");
  });

  it("surfaces Cloudflare error codes on failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        cfResponse({
          success: false,
          "error-codes": ["invalid-input-response"],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const result = await verifyTurnstile("bad-token");
    expect(result).toEqual({ ok: false, reason: "invalid-input-response" });
  });

  it("reports a non-OK HTTP status", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(cfResponse({}, { ok: false, status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await verifyTurnstile("token");
    expect(result).toEqual({ ok: false, reason: "cf-status-500" });
  });

  it("handles a network error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("boom"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await verifyTurnstile("token");
    expect(result).toEqual({ ok: false, reason: "network-error" });
  });
});
