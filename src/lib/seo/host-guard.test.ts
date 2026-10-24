import { describe, expect, it } from "vitest";

import { apexRedirect, isNonCanonicalHost } from "./host-guard";

describe("apexRedirect", () => {
  it("sends the bare domain to www, keeping path and query", () => {
    expect(apexRedirect("mmg-lawfirm.com", "https://mmg-lawfirm.com/contact?utm_source=x", "https://www.mmg-lawfirm.com")).toBe(
      "https://www.mmg-lawfirm.com/contact?utm_source=x",
    );
  });
  it("leaves every other host alone", () => {
    for (const h of ["www.mmg-lawfirm.com", "staging.mmg-lawfirm.com", "localhost:3000", null]) {
      expect(apexRedirect(h, "https://x/", "https://www.mmg-lawfirm.com")).toBeNull();
    }
  });
});

const SITE = "https://www.mmg-lawfirm.com";

describe("isNonCanonicalHost", () => {
  it("is false for the canonical host, case-insensitively", () => {
    expect(isNonCanonicalHost("www.mmg-lawfirm.com", SITE)).toBe(false);
    expect(isNonCanonicalHost("WWW.MMG-LAWFIRM.COM", SITE)).toBe(false);
  });

  it("is true for staging, workers.dev and preview hosts", () => {
    expect(isNonCanonicalHost("staging.mmg-lawfirm.com", SITE)).toBe(true);
    expect(isNonCanonicalHost("mmg-law-firm.jetnine-inc.workers.dev", SITE)).toBe(true);
    expect(isNonCanonicalHost("mmg-law-firm-abc123-alwayzlegits-projects.vercel.app", SITE)).toBe(true);
    expect(isNonCanonicalHost("mmg-lawfirm.com", SITE)).toBe(true); // apex redirects to www anyway
  });

  it("still flags staging when the deploy's own site URL is the staging host", () => {
    // Staging sets NEXT_PUBLIC_SITE_URL to itself; the proxy must compare
    // against the production origin, which is what it passes.
    expect(isNonCanonicalHost("staging.mmg-lawfirm.com", SITE)).toBe(true);
  });

  it("never fires for local development or when the site URL is local/invalid", () => {
    expect(isNonCanonicalHost("localhost:3000", SITE)).toBe(false);
    expect(isNonCanonicalHost("127.0.0.1:3000", SITE)).toBe(false);
    expect(isNonCanonicalHost("staging.mmg-lawfirm.com", "http://localhost:3000")).toBe(false);
    expect(isNonCanonicalHost("staging.mmg-lawfirm.com", "not a url")).toBe(false);
    expect(isNonCanonicalHost(null, SITE)).toBe(false);
  });
});
