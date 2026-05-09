import { describe, expect, it } from "vitest";

import {
  DISCLAIMERS,
  FIRM,
  FIRM_FULL_ADDRESS,
  TCPA_CONSENT_TEXT,
} from "./constants";

/**
 * These constants drive CRPC 7.1-mandated copy that appears verbatim in the
 * footer, near case-result and testimonial sections, and in the lead-form
 * consent snapshot. If any of this text or wiring drifts unintentionally,
 * we lose the legal basis for those snapshots. Treat these tests as a
 * regression guard, not a coverage exercise.
 */

describe("DISCLAIMERS — required four", () => {
  const required = ["general", "results", "testimonial", "advertising"] as const;

  it("exposes all four CRPC 7.1 disclaimer strings", () => {
    for (const key of required) {
      expect(typeof DISCLAIMERS[key]).toBe("string");
      expect(DISCLAIMERS[key].length).toBeGreaterThan(20);
    }
  });

  it("the past-results disclaimer says past results don't guarantee", () => {
    expect(DISCLAIMERS.results).toMatch(/past results/i);
    expect(DISCLAIMERS.results).toMatch(/guarantee/i);
  });

  it("the testimonial disclaimer mentions individual experiences and varying results", () => {
    expect(DISCLAIMERS.testimonial).toMatch(/individual/i);
    expect(DISCLAIMERS.testimonial).toMatch(/var/i);
  });

  it("the advertising disclaimer says this is an advertisement", () => {
    expect(DISCLAIMERS.advertising).toMatch(/advertisement/i);
  });

  it("the general disclaimer disclaims attorney-client relationship formation", () => {
    expect(DISCLAIMERS.general).toMatch(/attorney-client relationship/i);
    expect(DISCLAIMERS.general).toMatch(/legal advice/i);
  });
});

describe("TCPA_CONSENT_TEXT — exact-match snapshot critical", () => {
  it("identifies MMG Law Firm by name", () => {
    expect(TCPA_CONSENT_TEXT).toMatch(/MMG Law Firm/);
  });

  it("includes the autodialer disclosure", () => {
    expect(TCPA_CONSENT_TEXT).toMatch(/autodialer/i);
  });

  it("includes the 'consent is not a condition of service' phrase", () => {
    expect(TCPA_CONSENT_TEXT).toMatch(/not a condition of service/i);
  });

  it("includes the STOP opt-out", () => {
    expect(TCPA_CONSENT_TEXT).toMatch(/Reply STOP/i);
  });

  it("is at least 200 characters of substance", () => {
    expect(TCPA_CONSENT_TEXT.length).toBeGreaterThan(200);
  });
});

describe("FIRM constants — wiring sanity", () => {
  it("has the bar number in numeric-string form", () => {
    expect(FIRM.barNumber).toMatch(/^\d+$/);
  });

  it("phone display and tel are equivalent (same digits)", () => {
    const onlyDigits = (s: string) => s.replace(/\D/g, "");
    const tel = onlyDigits(FIRM.phoneTel);
    const display = onlyDigits(FIRM.phone);
    // The tel: link includes the country code; display doesn't.
    expect(tel.endsWith(display)).toBe(true);
    expect(tel.length).toBe(11); // +1 + 10 US digits
    expect(display.length).toBe(10);
  });

  it("address.state is two letters", () => {
    expect(FIRM.address.state).toMatch(/^[A-Z]{2}$/);
  });

  it("FIRM_FULL_ADDRESS contains the city and zip", () => {
    expect(FIRM_FULL_ADDRESS).toContain(FIRM.address.city);
    expect(FIRM_FULL_ADDRESS).toContain(FIRM.address.zip);
  });
});
