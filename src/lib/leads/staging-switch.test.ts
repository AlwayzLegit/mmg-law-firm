import { afterEach, describe, expect, it, vi } from "vitest";

const site = vi.hoisted(() => ({ url: "http://localhost:3000" }));
vi.mock("@/lib/seo/canonical", () => ({ siteUrl: () => site.url }));

import { forcedInsertFailure, STAGING_HOST } from "./staging-switch";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("forcedInsertFailure (OPS-347)", () => {
  it("is on only for the value 1 on the staging host", () => {
    vi.stubEnv("LEADS_FORCE_INSERT_FAIL", "1");
    site.url = `https://${STAGING_HOST}`;
    expect(forcedInsertFailure()).toBe(true);
    for (const off of ["", "0", "true", "yes"]) {
      vi.stubEnv("LEADS_FORCE_INSERT_FAIL", off);
      expect(forcedInsertFailure(), off).toBe(false);
    }
  });

  it("is off on production, on look-alike hosts and on a bad URL, whatever the variable holds", () => {
    vi.stubEnv("LEADS_FORCE_INSERT_FAIL", "1");
    for (const url of [
      "https://www.mmg-lawfirm.com",
      "https://mmg-lawfirm.com",
      "http://localhost:3000",
      "https://staging.mmg-lawfirm.com.evil.test",
      "https://notstaging.mmg-lawfirm.com",
      "not a url",
      "",
    ]) {
      site.url = url;
      expect(forcedInsertFailure(), url).toBe(false);
    }
  });

  it("is off when the variable is unset", () => {
    site.url = `https://${STAGING_HOST}`;
    expect(forcedInsertFailure()).toBe(false);
  });
});
