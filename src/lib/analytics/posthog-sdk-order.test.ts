// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("the installed browser SDK does not replay a capture made before init (isolated; no network)", async () => {
  vi.useFakeTimers();
  const fetchStub = vi.fn();
  const xhrStub = vi
    .spyOn(XMLHttpRequest.prototype, "send")
    .mockImplementation(() => {});
  vi.stubGlobal("fetch", fetchStub);
  const { default: posthog } = await import("posthog-js/dist/module.slim");
  const seen: string[] = [];
  posthog.capture("isolated_before_init");
  posthog.init("phc_ISOLATED_TEST_ONLY", {
    api_host: "https://analytics.invalid",
    persistence: "memory",
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    before_send: (event) => {
      if (event) seen.push(event.event);
      return null;
    },
  });
  posthog.capture("isolated_after_init");
  expect(seen).toEqual(["isolated_after_init"]);
  expect(fetchStub).not.toHaveBeenCalled();
  expect(xhrStub).not.toHaveBeenCalled();
  posthog.opt_out_capturing();
  vi.clearAllTimers();
});
