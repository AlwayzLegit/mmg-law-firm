// @vitest-environment jsdom
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  ready: false,
  calls: [] as { name: string; ready: boolean; props: unknown }[],
  init: vi.fn(),
  capture: vi.fn(),
}));
const route = vi.hoisted(() => ({ pathname: "/contact", query: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  // Deliberately a new object on each render, as a router may provide.
  useSearchParams: () => new URLSearchParams(route.query),
}));
vi.mock("posthog-js/dist/module.slim", () => ({ default: sdk }));

let root: Root;
let Runtime: typeof import("@/components/analytics/posthog-runtime").PostHogRuntime;

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_ISOLATED_TEST_ONLY");
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  sdk.ready = false;
  sdk.calls = [];
  sdk.init.mockReset().mockImplementation(() => {
    sdk.ready = true;
  });
  sdk.capture.mockReset().mockImplementation((name, props) => {
    sdk.calls.push({ name, props, ready: sdk.ready });
  });
  route.pathname = "/contact";
  route.query = "";
  window.history.replaceState(null, "", "/contact");
  window.__mmgTrackQueue = [];
  Runtime = (await import("@/components/analytics/posthog-runtime"))
    .PostHogRuntime;
  root = createRoot(document.createElement("div"));
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function render(strict = false) {
  await act(async () =>
    root.render(
      strict
        ? createElement(StrictMode, null, createElement(Runtime))
        : createElement(Runtime),
    ),
  );
}
async function navigate(path: string, query = "") {
  route.pathname = path;
  route.query = query;
  window.history.replaceState(null, "", path + (query ? `?${query}` : ""));
  await render();
}
const views = () => sdk.calls.filter(({ name }) => name === "$pageview");

describe("public PostHog runtime with real React effects and no network", () => {
  it("captures the first pageview only after SDK initialization", async () => {
    await render();
    expect(views()).toEqual([
      {
        name: "$pageview",
        ready: true,
        props: { $current_url: window.origin + "/contact" },
      },
    ]);
  });
  it("does not duplicate initialization or pageviews in StrictMode", async () => {
    await render(true);
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(views()).toHaveLength(1);
    expect(views()[0].ready).toBe(true);
  });
  it("counts route, query and return navigation but not equal-URL rerenders", async () => {
    await render();
    await render();
    await navigate("/contact", "source=guide");
    await render();
    await navigate("/practice-areas/car-accidents");
    await navigate("/contact");
    expect(views().map(({ props }) => props)).toEqual([
      { $current_url: window.origin + "/contact" },
      { $current_url: window.origin + "/contact?source=guide" },
      { $current_url: window.origin + "/practice-areas/car-accidents" },
      { $current_url: window.origin + "/contact" },
    ]);
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.calls.every(({ ready }) => ready)).toBe(true);
  });
  it("retains queued public events and stops listening after unmount", async () => {
    const { track } = await import("./track");
    track("isolated_public_event", { source: "test" });
    await render();
    expect(sdk.calls.map(({ name }) => name)).toEqual([
      "isolated_public_event",
      "$pageview",
    ]);
    expect(sdk.calls.every(({ ready }) => ready)).toBe(true);
    await act(async () => root.unmount());
    root = createRoot(document.createElement("div"));
    track("isolated_later_event");
    expect(sdk.calls).toHaveLength(2);
    await render();
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(views()).toHaveLength(1);
    expect(sdk.calls.at(-1)?.name).toBe("isolated_later_event");
  });
  it.each(["/admin/today", "/login", "/auth/callback", "/onboarding"])(
    "does not initialize or capture on %s",
    async (path) => {
      await navigate(path);
      expect(sdk.init).not.toHaveBeenCalled();
      expect(sdk.calls).toEqual([]);
    },
  );
  it("keeps private paths out of events after a public mount", async () => {
    await render();
    await navigate("/admin/today");
    const { track } = await import("./track");
    track("isolated_private_event");
    expect(sdk.calls).toHaveLength(1);
    await navigate("/contact");
    expect(views()).toHaveLength(2);
  });
  it("preserves the privacy, survey and manual-capture configuration", async () => {
    await render();
    const config = sdk.init.mock.calls[0][1];
    expect(config).toMatchObject({
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: false,
      disable_session_recording: true,
      person_profiles: "identified_only",
    });
    expect(config).not.toHaveProperty("disable_surveys");
    expect(config).not.toHaveProperty("advanced_disable_flags");
    expect(
      config.before_send({
        event: "$pageview",
        properties: { $current_url: window.origin + "/admin" },
      }),
    ).toBeNull();
  });
});
