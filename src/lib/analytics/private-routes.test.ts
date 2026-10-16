import { afterEach, describe, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { readFileSync, existsSync } from "node:fs";
import {
  isPrivateAnalyticsPath,
  isPrivateAnalyticsUrl,
  withoutPrivateAnalyticsUrls,
} from "./private-routes";
import { googleAnalyticsInit } from "./google-init";
import { track, drainTrackQueue } from "./track";

const origin = "https://www.mmg-lawfirm.com";
const internal = [
  "/admin",
  "/admin/leads?q=dummy",
  "/admin/unknown",
  "/login",
  "/login/",
  "/onboarding?reset=1",
  "/auth/callback",
  "/%61dmin/leads",
  "/ADMIN",
];

describe("private analytics boundary", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each(internal)("excludes %s", (path) =>
    expect(isPrivateAnalyticsPath(path)).toBe(true),
  );
  it.each([
    "/",
    "/contact",
    "/practice-areas/car-accidents",
    "/administration",
    "/login-help",
    "/blog/admin-advice",
    "/contact?next=/admin",
  ])("preserves public path %s", (path) =>
    expect(isPrivateAnalyticsPath(path)).toBe(false),
  );
  it("recognizes apex/www private referrers but not external login pages", () => {
    expect(
      isPrivateAnalyticsUrl("https://mmg-lawfirm.com/admin?q=dummy", origin),
    ).toBe(true);
    expect(isPrivateAnalyticsUrl("/login?next=/admin", origin)).toBe(true);
    expect(isPrivateAnalyticsUrl("https://other.example/login", origin)).toBe(
      false,
    );
  });
  it("redacts legacy nested internal URLs without touching public properties or SDK tokens", () => {
    const input = {
      token: "phc_dummy",
      $current_url: origin + "/contact?utm_source=public",
      $referrer: origin + "/admin/leads?q=dummy",
      $set: {
        $initial_current_url: origin + "/login?next=dummy",
        $initial_pathname: "/admin",
        $initial_referrer: "https://search.example/",
      },
      array: ["/admin/private", "/contact"],
      flag: true,
    };
    expect(withoutPrivateAnalyticsUrls(input, origin)).toEqual({
      token: "phc_dummy",
      $current_url: origin + "/contact?utm_source=public",
      $set: { $initial_referrer: "https://search.example/" },
      array: ["/contact"],
      flag: true,
    });
    expect(input.$referrer).toContain("dummy");
  });
  it("does not enqueue internal events or replay a queue on an internal page", () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", {
      location: { pathname: "/admin/leads" },
      dispatchEvent,
      __mmgTrackQueue: [["old", { pathname: "/admin" }]],
    });
    track("phone_click", { pathname: "/admin/leads" });
    expect(dispatchEvent).not.toHaveBeenCalled();
    expect(drainTrackQueue()).toEqual([]);
    expect(window.__mmgTrackQueue).toEqual([]);
  });
  it("keeps roots separate and private documents analytics-free by default", () => {
    expect(existsSync("src/app/layout.tsx")).toBe(false);
    const admin = readFileSync("src/app/(admin)/layout.tsx", "utf8");
    expect(admin).not.toContain("publicAnalytics");
    expect(readFileSync("src/app/(marketing)/layout.tsx", "utf8")).toContain(
      "<RootDocument publicAnalytics>",
    );
    expect(
      readFileSync("src/components/layout/root-document.tsx", "utf8"),
    ).toContain("publicAnalytics = false");
  });
});

describe("Google bootstrap (isolated; never sends network traffic)", () => {
  function init(path: string, referrer = "") {
    const win: Record<string, unknown> = { location: new URL(path, origin) };
    runInNewContext(googleAnalyticsInit("G-TESTONLY"), {
      window: win,
      document: { referrer },
      URL,
    });
    return {
      win,
      commands:
        (win.dataLayer as IArguments[] | undefined)?.map((args) =>
          Array.from(args),
        ) ?? [],
    };
  }
  it.each(internal)("never configures GA on %s", (path) => {
    const { win, commands } = init(path);
    expect(commands).toEqual([]);
    expect(win["ga-disable-G-TESTONLY"]).toBe(true);
  });
  it("preserves one initial pageview and existing public attribution", () => {
    const { commands } = init("/contact", "https://search.example/?q=public");
    expect(commands.length).toBe(2);
    expect(commands[1]).toEqual([
      "config",
      "G-TESTONLY",
      { send_page_view: true },
    ]);
  });
  it.each([
    origin + "/admin/leads?q=dummy",
    "https://mmg-lawfirm.com/login?next=dummy",
  ])("drops an internal referrer %s", (referrer) => {
    expect(init("/contact", referrer).commands[1]).toEqual([
      "config",
      "G-TESTONLY",
      { send_page_view: true, page_referrer: "" },
    ]);
  });
  it("does not inject a script-closing sequence from configuration", () => {
    expect(googleAnalyticsInit("</script>")).not.toContain("</script>");
  });
});
