// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { INTERACTION_EVENTS, afterFirstInteraction, afterPageIdle } from "./after-page-idle";

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

describe("afterFirstInteraction", () => {
  function setup(fallback?: number) {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    const task = vi.fn();
    const cancel = afterFirstInteraction(task, fallback);
    return { task, cancel };
  }

  it.each(INTERACTION_EVENTS)("runs once after a %s, not inside the handler", (name) => {
    const { task } = setup();
    vi.advanceTimersByTime(10000);
    expect(task).not.toHaveBeenCalled();
    window.dispatchEvent(new Event(name));
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    window.dispatchEvent(new Event(name));
    vi.runAllTimers();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("hears a scroll that happens on the document", () => {
    const { task } = setup();
    document.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(2000);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("runs after the fallback for a visitor who only reads", () => {
    const { task } = setup(20000);
    vi.advanceTimersByTime(19999);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2001);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("never runs a cancelled task", () => {
    const { task, cancel } = setup();
    cancel();
    window.dispatchEvent(new Event("pointerdown"));
    vi.runAllTimers();
    expect(task).not.toHaveBeenCalled();
  });

  it("can be cancelled between the interaction and the idle run", () => {
    const { task, cancel } = setup();
    window.dispatchEvent(new Event("keydown"));
    cancel();
    vi.runAllTimers();
    expect(task).not.toHaveBeenCalled();
  });
});
