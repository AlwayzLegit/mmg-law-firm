// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { afterPageIdle } from "./after-page-idle";

function setReadyState(state: DocumentReadyState) {
  Object.defineProperty(document, "readyState", { configurable: true, get: () => state });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setReadyState("complete");
});

describe("afterPageIdle", () => {
  it("waits for the load event, then for idle", () => {
    setReadyState("loading");
    const idle: (() => void)[] = [];
    vi.stubGlobal("requestIdleCallback", vi.fn((cb: () => void) => idle.push(cb)));
    const task = vi.fn();
    afterPageIdle(task, 4000);

    expect(window.requestIdleCallback).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("load"));
    expect(window.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 4000 });
    expect(task).not.toHaveBeenCalled();
    idle[0]();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("falls back to a timer without requestIdleCallback", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    const task = vi.fn();
    afterPageIdle(task);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2500);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("never runs a cancelled task", () => {
    setReadyState("loading");
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    const task = vi.fn();
    const cancel = afterPageIdle(task);
    cancel();
    window.dispatchEvent(new Event("load"));
    vi.runAllTimers();
    expect(task).not.toHaveBeenCalled();
  });
});
