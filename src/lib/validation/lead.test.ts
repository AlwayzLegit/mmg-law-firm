import { describe, expect, it } from "vitest";

import { LeadSchema } from "./lead";

const baseValid = {
  full_name: "Jane Doe",
  phone: "(818) 568-5818",
  consent_contact: true,
  turnstileToken: "tok_abc123",
};

describe("LeadSchema — happy path", () => {
  it("accepts the minimum valid submission and normalizes the phone to E.164", () => {
    const result = LeadSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("+18185685818");
      expect(result.data.consent_contact).toBe(true);
      // Defaults applied
      expect(result.data.preferred_contact).toBe("phone");
      expect(result.data.has_attorney).toBe(false);
    }
  });

  it("normalizes several common phone input formats to the same E.164", () => {
    const variants = [
      "8185685818",
      "(818) 568-5818",
      "818-568-5818",
      "818.568.5818",
      "+1 818 568 5818",
      "1 (818) 568-5818",
    ];
    for (const phone of variants) {
      const result = LeadSchema.safeParse({ ...baseValid, phone });
      expect(result.success, `failed on input: ${phone}`).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBe("+18185685818");
      }
    }
  });

  it("treats empty optional strings as undefined (email, description, incident_date)", () => {
    const result = LeadSchema.safeParse({
      ...baseValid,
      email: "",
      description: "",
      incident_date: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeUndefined();
      expect(result.data.description).toBeUndefined();
      expect(result.data.incident_date).toBeUndefined();
    }
  });

  it("accepts a fully populated submission", () => {
    const result = LeadSchema.safeParse({
      ...baseValid,
      email: "jane@example.com",
      preferred_contact: "text",
      practice_area: "car-accidents",
      county_slug: "los-angeles-county",
      city_slug: "glendale",
      incident_date: "2025-03-14",
      description: "Rear-ended at a stop light on Brand and Glenoaks.",
      has_attorney: false,
      utm_source: "google",
      utm_medium: "cpc",
      gclid: "abc123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.practice_area).toBe("car-accidents");
      expect(result.data.utm_source).toBe("google");
    }
  });
});

describe("LeadSchema — required-field rejections", () => {
  it("rejects when full_name is too short", () => {
    const result = LeadSchema.safeParse({ ...baseValid, full_name: "J" });
    expect(result.success).toBe(false);
  });

  it("rejects when consent_contact is false", () => {
    const result = LeadSchema.safeParse({
      ...baseValid,
      consent_contact: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("consent_contact"),
      );
      expect(issue?.message).toMatch(/consent/i);
    }
  });

  it("rejects when turnstileToken is missing", () => {
    const { turnstileToken: _ignore, ...rest } = baseValid;
    void _ignore;
    const result = LeadSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("LeadSchema — phone validation", () => {
  it("rejects clearly invalid US phone strings", () => {
    const invalids = ["abc", "555", "1234567"];
    for (const phone of invalids) {
      const result = LeadSchema.safeParse({ ...baseValid, phone });
      expect(result.success, `should reject: ${phone}`).toBe(false);
    }
  });

  it("rejects non-US numbers", () => {
    // London number — valid international, but not US.
    const result = LeadSchema.safeParse({
      ...baseValid,
      phone: "+44 20 7946 0958",
    });
    expect(result.success).toBe(false);
  });
});

describe("LeadSchema — email validation", () => {
  it("rejects malformed emails when present", () => {
    const result = LeadSchema.safeParse({
      ...baseValid,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid email", () => {
    const result = LeadSchema.safeParse({
      ...baseValid,
      email: "jane@example.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("LeadSchema — description and length caps", () => {
  it("rejects descriptions over 500 characters", () => {
    const longDesc = "x".repeat(501);
    const result = LeadSchema.safeParse({
      ...baseValid,
      description: longDesc,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a description right at the 500-character limit", () => {
    const desc = "y".repeat(500);
    const result = LeadSchema.safeParse({ ...baseValid, description: desc });
    expect(result.success).toBe(true);
  });
});

describe("LeadSchema — practice_area enum", () => {
  it("rejects unknown practice areas", () => {
    const result = LeadSchema.safeParse({
      ...baseValid,
      practice_area: "widget-law",
    });
    expect(result.success).toBe(false);
  });

  it("accepts known practice areas", () => {
    const result = LeadSchema.safeParse({
      ...baseValid,
      practice_area: "rideshare-accidents",
    });
    expect(result.success).toBe(true);
  });
});

describe("LeadSchema — spam heuristics (superRefine)", () => {
  it("rejects when the name field contains a URL", () => {
    const result = LeadSchema.safeParse({
      ...baseValid,
      full_name: "https://spammer.example",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when description contains 3+ URLs", () => {
    const result = LeadSchema.safeParse({
      ...baseValid,
      description:
        "See https://a.com and https://b.com and https://c.com please",
    });
    expect(result.success).toBe(false);
  });

  it("allows description with exactly 2 URLs (heuristic threshold is 3)", () => {
    const result = LeadSchema.safeParse({
      ...baseValid,
      description: "References: https://a.com and https://b.com.",
    });
    expect(result.success).toBe(true);
  });
});
