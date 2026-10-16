import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  path: "/practice-areas/car-accidents" as string | null,
  ready: false,
  effect: undefined as undefined | (() => void | (() => void)),
  setReady: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: () => [state.ready, state.setReady],
  useEffect: (fn: () => void | (() => void)) => { state.effect = fn; },
}));
vi.mock("next/navigation", () => ({usePathname: () => state.path}));
vi.mock("next/dynamic", () => ({default: () => () => createElement("span", {"data-toast-host": true})}));
import { DeferredToaster } from "./deferred-toaster";

describe("deferred toast host lifecycle", () => {
  let idle: ReturnType<typeof vi.fn>;
  let cancel: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    state.path = "/practice-areas/car-accidents";
    state.ready = false;
    state.effect = undefined;
    state.setReady.mockReset();
    idle = vi.fn(() => 42);
    cancel = vi.fn();
    vi.stubGlobal("window", {requestIdleCallback: idle, cancelIdleCallback: cancel, setTimeout: vi.fn(() => 7), clearTimeout: vi.fn()});
  });
  afterEach(() => vi.unstubAllGlobals());
  function render() { return renderToStaticMarkup(createElement(DeferredToaster, {})); }
  it("does not schedule or render the host on initial hub loads", () => {
    expect(render()).toBe("");
    expect(state.effect?.()).toBeUndefined();
    expect(idle).not.toHaveBeenCalled();
  });
  it("schedules normally after navigation to a route with toast producers", () => {
    render(); state.effect?.();
    state.path = "/contact";
    expect(render()).toBe("");
    const cleanup = state.effect?.();
    expect(idle).toHaveBeenCalledWith(expect.any(Function), {timeout: 2000});
    (idle.mock.calls[0][0] as unknown as () => void)();
    expect(state.setReady).toHaveBeenCalledWith(true);
    if (cleanup) cleanup();
    expect(cancel).toHaveBeenCalledWith(42);
  });
  it("keeps already-mounted notifications when navigating back to a hub", () => {
    state.ready = true;
    expect(render()).toContain("data-toast-host");
    expect(state.effect?.()).toBeUndefined();
    expect(idle).not.toHaveBeenCalled();
  });
  it("retains the timed fallback and cancellation where idle callbacks are unavailable", () => {
    const timer=vi.fn(() => 7),clear=vi.fn();
    vi.stubGlobal("window", {setTimeout: timer, clearTimeout: clear});
    state.path = "/login";
    render();
    const cleanup=state.effect?.();
    expect(timer).toHaveBeenCalledWith(expect.any(Function),1200);
    if(cleanup) cleanup();
    expect(clear).toHaveBeenCalledWith(7);
  });
});
