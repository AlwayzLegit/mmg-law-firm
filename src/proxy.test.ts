import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/env", () => ({ env: { CSP_REPORT_ONLY: false } }));

import { proxy } from "./proxy";

async function directives() {
  const response = await proxy(new NextRequest("https://www.mmg-lawfirm.com/"));
  return new Map(
    response.headers
      .get("content-security-policy")!
      .split("; ")
      .map((directive) => {
        const [name, ...sources] = directive.split(" ");
        return [name, sources];
      }),
  );
}

describe("analytics collection CSP", () => {
  it("allows the existing Google Analytics collection endpoints narrowly", async () => {
    const csp = await directives();
    expect(csp.get("connect-src")).toContain(
      "https://analytics.google.com/g/collect",
    );
    expect(csp.get("connect-src")).toContain(
      "https://www.google.com/g/collect",
    );
    expect(csp.get("connect-src")).toContain("https://*.google-analytics.com");
  });

  it("retains the security restrictions and does not allow advertising hosts", async () => {
    const csp = await directives();
    expect(csp.get("connect-src")).not.toContain("*");
    expect(csp.get("connect-src")).not.toContain("https://*.google.com");
    expect(
      csp
        .get("connect-src")!
        .some(
          (source) =>
            source.includes("doubleclick") ||
            source.includes("googlesyndication"),
        ),
    ).toBe(false);
    expect(csp.get("script-src")).not.toContain("'unsafe-eval'");
    expect(csp.get("object-src")).toEqual(["'none'"]);
    expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
    expect(csp.get("form-action")).toEqual(["'self'"]);
    expect(csp.get("report-uri")).toEqual(["/api/csp-report"]);
  });

  it("still sends unauthenticated admin requests to login", async () => {
    const response = await proxy(
      new NextRequest("https://www.mmg-lawfirm.com/admin/today"),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://www.mmg-lawfirm.com/login?next=%2Fadmin%2Ftoday",
    );
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it.each(["/login", "/onboarding", "/auth/callback", "/admin/leads?q=dummy"])(
    "prevents private referrers on %s",
    async (path) => {
      const response = await proxy(
        new NextRequest("https://www.mmg-lawfirm.com" + path),
      );
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      expect(response.headers.get("content-security-policy")).toContain(
        "https://*.ingest.sentry.io",
      );
    },
  );

  it("does not override public referrer policy", async () => {
    const response = await proxy(
      new NextRequest("https://www.mmg-lawfirm.com/contact"),
    );
    expect(response.headers.has("referrer-policy")).toBe(false);
  });
});

describe("home hero preload", () => {
  it("sends the hero as a Link preload on the home document only", async () => {
    const doc = { "sec-fetch-dest": "document", accept: "text/html,*/*;q=0.8" };
    const home = await proxy(new NextRequest("https://www.mmg-lawfirm.com/", { headers: doc }));
    expect(home.headers.get("link")).toContain("homepage-law-library-background.webp>; rel=preload; as=image");
    // Clients without Sec-Fetch-* fall back to Accept.
    const legacy = await proxy(new NextRequest("https://www.mmg-lawfirm.com/", { headers: { accept: "text/html" } }));
    expect(legacy.headers.get("link")).not.toBeNull();
    // A prefetch of "/" is a fetch() — Next strips its RSC headers before the
    // proxy runs, so only the fetch metadata tells them apart. No hint there,
    // nor on other pages.
    const prefetch = await proxy(
      new NextRequest("https://www.mmg-lawfirm.com/", { headers: { "sec-fetch-dest": "empty", accept: "*/*" } }),
    );
    expect(prefetch.headers.get("link")).toBeNull();
    const bare = await proxy(new NextRequest("https://www.mmg-lawfirm.com/"));
    expect(bare.headers.get("link")).toBeNull();
    const contact = await proxy(new NextRequest("https://www.mmg-lawfirm.com/contact", { headers: doc }));
    expect(contact.headers.get("link")).toBeNull();
  });
});
