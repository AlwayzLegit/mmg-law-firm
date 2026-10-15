import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { observeFormVisibility } from "./observe-form-visibility";

describe("form verification activation", () => {
  const activate = vi.fn();
  const observe = vi.fn();
  const disconnect = vi.fn();
  const target = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    contains: vi.fn().mockReturnValue(false),
  };
  const widget = { closest: vi.fn().mockReturnValue(target) };
  let intersect: (entries: { isIntersecting: boolean }[]) => void;
  const observerConstructor = vi.fn(function (
    callback: typeof intersect,
    options: IntersectionObserverInit,
  ) {
    void options;
    intersect = callback;
    return { observe, disconnect };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    target.contains.mockReturnValue(false);
    widget.closest.mockReturnValue(target);
    vi.stubGlobal("document", { activeElement: null });
    vi.stubGlobal("IntersectionObserver", observerConstructor);
  });
  afterEach(() => vi.unstubAllGlobals());

  const start = () =>
    observeFormVisibility(widget as unknown as HTMLElement, activate);

  it("defers a distant form and initializes once when it approaches view", () => {
    start();
    expect(widget.closest).toHaveBeenCalledWith("form");
    expect(observe).toHaveBeenCalledWith(target);
    expect(observerConstructor.mock.calls[0][1]).toEqual({
      rootMargin: "400px 0px",
    });
    intersect([{ isIntersecting: false }]);
    expect(activate).not.toHaveBeenCalled();
    intersect([{ isIntersecting: true }]);
    intersect([{ isIntersecting: true }]);
    expect(activate).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it.each(["focusin", "pointerdown"])(
    "activates immediately on %s without inspecting input values",
    (type) => {
      start();
      const handler = target.addEventListener.mock.calls.find(
        ([event]) => event === type,
      )![1] as () => void;
      handler();
      expect(activate).toHaveBeenCalledTimes(1);
      expect(target.removeEventListener).toHaveBeenCalledWith(type, handler);
    },
  );

  it("falls back to immediate activation without IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    start();
    expect(activate).toHaveBeenCalledTimes(1);
    expect(observe).not.toHaveBeenCalled();
  });

  it("activates if the visitor focused the form before hydration", () => {
    vi.stubGlobal("document", { activeElement: {} });
    target.contains.mockReturnValue(true);
    start();
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it("disconnects and ignores queued callbacks after unmount", () => {
    const stop = start();
    stop();
    intersect([{ isIntersecting: true }]);
    expect(activate).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(target.removeEventListener).toHaveBeenCalledTimes(2);
  });

  it("retains late-mount readiness, error/expiry clearing, and mandatory server verification", () => {
    const component = readFileSync(
      "src/components/marketing/turnstile.tsx",
      "utf8",
    );
    const route = readFileSync("src/app/api/leads/route.ts", "utf8");
    expect(component).toContain("onReady={() => setLoaded(true)}");
    expect(component).toContain('"expired-callback": () => onToken("")');
    expect(component).toContain('onToken("")');
    expect(route).toContain("verifyTurnstile(");
    expect(route).toContain('"turnstile-failed"');
  });
});
