import { afterEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit } from "./rate-limit";

// With no Supabase env configured (the vitest default), checkRateLimit uses
// its per-instance in-memory fallback — which is exactly what we exercise.

afterEach(() => {
  vi.useRealTimers();
});

function uniqueKey(): string {
  return `test:${Math.random().toString(36).slice(2)}`;
}

describe("checkRateLimit (in-memory fallback)", () => {
  it("allows up to the limit, then blocks", async () => {
    const key = uniqueKey();
    for (let i = 0; i < 3; i++) {
      const r = await checkRateLimit(key, 3);
      expect(r.allowed, `call ${i + 1}`).toBe(true);
    }
    const blocked = await checkRateLimit(key, 3);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(3600);
    }
  });

  it("keys are independent", async () => {
    const a = uniqueKey();
    const b = uniqueKey();
    await checkRateLimit(a, 1); // exhaust a
    const aBlocked = await checkRateLimit(a, 1);
    const bAllowed = await checkRateLimit(b, 1);
    expect(aBlocked.allowed).toBe(false);
    expect(bAllowed.allowed).toBe(true);
  });

  it("resets after the window elapses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const key = uniqueKey();

    expect((await checkRateLimit(key, 1)).allowed).toBe(true);
    expect((await checkRateLimit(key, 1)).allowed).toBe(false);

    // Advance just past the 1-hour window.
    vi.setSystemTime(3600 * 1000 + 1);
    expect((await checkRateLimit(key, 1)).allowed).toBe(true);
  });
});
