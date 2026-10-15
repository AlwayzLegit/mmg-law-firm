import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startPhoneClickTracking } from "./phone-clicks";
import { drainTrackQueue, TRACK_EVENT } from "./track";

describe("early phone-click tracking", () => {
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();
  const dispatchEvent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("document", { addEventListener, removeEventListener });
    vi.stubGlobal("window", {
      location: { pathname: "/contact", search: "?private=do-not-record" },
      dispatchEvent,
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  function click(isPhoneLink: boolean) {
    const handler = addEventListener.mock.calls[0][1] as (
      event: MouseEvent,
    ) => void;
    const closest = vi.fn().mockReturnValue(isPhoneLink ? {} : null);
    const preventDefault = vi.fn();
    handler({ target: { closest }, preventDefault } as unknown as MouseEvent);
    return { closest, preventDefault };
  }

  it("queues an immediate Call click before the SDK is available", () => {
    startPhoneClickTracking();
    const { closest, preventDefault } = click(true);
    expect(closest).toHaveBeenCalledExactlyOnceWith('a[href^="tel:"]');
    expect(drainTrackQueue()).toEqual([
      ["phone_click", { pathname: "/contact" }],
    ]);
    expect(drainTrackQueue()).toEqual([]);
    expect(dispatchEvent.mock.calls[0][0].type).toBe(TRACK_EVENT);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("ignores non-phone interactions", () => {
    startPhoneClickTracking();
    click(false);
    expect(drainTrackQueue()).toEqual([]);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("handles non-element targets without throwing", () => {
    startPhoneClickTracking();
    const handler = addEventListener.mock.calls[0][1] as (
      event: MouseEvent,
    ) => void;
    expect(() => handler({ target: null } as MouseEvent)).not.toThrow();
    expect(drainTrackQueue()).toEqual([]);
  });

  it("removes exactly the listener it installed on cleanup", () => {
    const stop = startPhoneClickTracking();
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(addEventListener.mock.calls[0][0]).toBe("click");
    stop();
    expect(removeEventListener).toHaveBeenCalledExactlyOnceWith(
      "click",
      addEventListener.mock.calls[0][1],
      { capture: true },
    );
  });
});
