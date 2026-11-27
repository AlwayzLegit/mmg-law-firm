import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// OPS-43: the log lines of the database path must hold the scope of a rate
// limit key ("leads", "pw-reset") and never the part after the colon, which can
// be a visitor's IP address or an email address. This file has its own module
// mocks so they do not touch the in-memory tests in rate-limit.test.ts.

const rpcResults: Array<() => Promise<unknown>> = [];

vi.mock("@/lib/supabase/server", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/env", () => ({ env: { SUPABASE_SERVICE_ROLE_KEY: "test" } }));
vi.mock("@/lib/supabase/admin", () => ({
  getServiceSupabase: () => ({
    rpc: () => ({
      maybeSingle: () => {
        const next = rpcResults.shift();
        if (!next) throw new Error("no more fake replies");
        return next();
      },
    }),
  }),
}));

import { checkRateLimit, rateLimitScope } from "./rate-limit";

const IP_KEY = "leads:203.0.113.7"; // a documentation address (RFC 5737)
const EMAIL_KEY = "pw-reset:someone@example.com";

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  rpcResults.length = 0;
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

const logged = () =>
  warn.mock.calls.map((c: unknown[]) => c.map(String).join(" ")).join("\n");

describe("rateLimitScope", () => {
  it("returns the text before the first colon", () => {
    expect(rateLimitScope("leads:1.2.3.4")).toBe("leads");
    expect(rateLimitScope("api:abc")).toBe("api");
    expect(rateLimitScope("pw-reset:someone@example.com")).toBe("pw-reset");
  });

  it("never returns a key that has no colon, or an odd scope", () => {
    expect(rateLimitScope("203.0.113.7")).toBe("other");
    expect(rateLimitScope("")).toBe("other");
    expect(rateLimitScope(":leads")).toBe("other");
    expect(rateLimitScope("someone@example.com:x")).toBe("other");
  });
});

describe("checkRateLimit log lines when the database call fails", () => {
  it("logs the scope and not the IP address when the RPC returns an error", async () => {
    rpcResults.push(async () => ({
      data: null,
      error: { message: "rpc down" },
    }));
    const r = await checkRateLimit(IP_KEY, 5);
    expect(r.allowed).toBe(true); // the in-memory fallback still runs
    expect(logged()).toContain("scope=leads");
    expect(logged()).not.toContain("203.0.113.7");
  });

  it("logs the scope and not the email address when the RPC returns no data", async () => {
    rpcResults.push(async () => ({ data: null, error: null }));
    const r = await checkRateLimit(EMAIL_KEY, 5);
    expect(r.allowed).toBe(true);
    expect(logged()).toContain("scope=pw-reset");
    expect(logged()).toContain("no data");
    expect(logged()).not.toContain("@");
    expect(logged()).not.toContain("someone");
  });

  it("logs the error name and message, not the error object, when the call throws", async () => {
    rpcResults.push(async () => {
      const err = new Error("connection reset") as Error & { details: string };
      err.details = `Key (p_key)=(${IP_KEY}) is bad`;
      throw err;
    });
    const r = await checkRateLimit(IP_KEY, 5);
    expect(r.allowed).toBe(true);
    expect(logged()).toContain("scope=leads");
    expect(logged()).toContain("Error: connection reset");
    expect(logged()).not.toContain("203.0.113.7");
    // warn was given one string, never the error object itself
    expect(
      warn.mock.calls.every(
        (c: unknown[]) => c.length === 1 && typeof c[0] === "string",
      ),
    ).toBe(true);
  });

  it("says unknown error when something that is not an Error is thrown", async () => {
    rpcResults.push(async () => {
      throw `raw ${IP_KEY}`;
    });
    await checkRateLimit(IP_KEY, 5);
    expect(logged()).toContain("unknown error");
    expect(logged()).not.toContain("203.0.113.7");
  });

  it("cuts a long error message to 200 characters", async () => {
    rpcResults.push(async () => {
      throw new Error("x".repeat(500));
    });
    await checkRateLimit(IP_KEY, 5);
    expect(logged()).not.toContain("x".repeat(201));
  });
});

// OPS-347: a database that does not answer must not hold the lead form. After 3 s the
// RPC counts as failed, the scope is logged without the key's second half, and the
// in-memory bucket decides.
describe("rate limit RPC deadline (OPS-347)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("falls back to the in-memory bucket when the RPC never answers", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    rpcResults.push(() => new Promise(() => {}));
    const pending = checkRateLimit(IP_KEY, 5);
    await vi.advanceTimersByTimeAsync(2999);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ allowed: true });
    const text = logged();
    expect(text).toContain("RPC timed out for scope=leads");
    expect(text).not.toContain("203.0.113.7");
  });
});
