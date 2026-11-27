import { afterEach, describe, expect, it, vi } from "vitest";

import { withDeadline } from "./deadline";

afterEach(() => {
  vi.useRealTimers();
});

describe("withDeadline", () => {
  it("returns the value when the work finishes first", async () => {
    await expect(withDeadline(Promise.resolve(7), 1000)).resolves.toBe(7);
  });

  it("returns null when the limit passes first", async () => {
    vi.useFakeTimers();
    const never = new Promise<number>(() => {});
    const result = withDeadline(never, 5000);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(result).resolves.toBeNull();
  });

  it("passes a rejection through and clears its timer", async () => {
    vi.useFakeTimers();
    await expect(
      withDeadline(Promise.reject(new Error("boom")), 5000),
    ).rejects.toThrow("boom");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears its timer after a value", async () => {
    vi.useFakeTimers();
    await withDeadline(Promise.resolve(1), 5000);
    expect(vi.getTimerCount()).toBe(0);
  });
});
