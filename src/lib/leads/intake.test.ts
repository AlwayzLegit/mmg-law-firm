import { describe, expect, it } from "vitest";

import { detectSpam, escapeHtml, parseClientIp } from "./intake";

describe("parseClientIp", () => {
  it("takes the first hop of x-forwarded-for", () => {
    expect(
      parseClientIp("203.0.113.5, 70.41.3.18, 150.172.238.178", null),
    ).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when forwarded is absent", () => {
    expect(parseClientIp(null, "198.51.100.7")).toBe("198.51.100.7");
  });

  it("accepts IPv6", () => {
    expect(parseClientIp("2001:db8::1", null)).toBe("2001:db8::1");
  });

  it("rejects a forged non-IP header as 'unknown'", () => {
    expect(parseClientIp("not-an-ip; DROP TABLE leads", null)).toBe("unknown");
  });

  it("returns 'unknown' when both headers are missing", () => {
    expect(parseClientIp(null, null)).toBe("unknown");
  });

  it("returns 'unknown' for an empty forwarded hop", () => {
    expect(parseClientIp(" , 1.2.3.4", null)).toBe("unknown");
  });

  it("caps the length so an over-long header can't poison the key", () => {
    const out = parseClientIp("1".repeat(100), null);
    expect(out.length).toBeLessThanOrEqual(45);
  });
});

describe("escapeHtml", () => {
  it("escapes all five significant characters", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });

  it("neutralizes a script-tag injection", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeHtml("Jane Doe")).toBe("Jane Doe");
  });
});

describe("detectSpam", () => {
  it("flags a tripped honeypot regardless of other fields", () => {
    expect(detectSpam({ fullName: "Jane Doe", company: "buy-now" })).toBe(true);
  });

  it("ignores an empty / whitespace-only honeypot", () => {
    expect(detectSpam({ fullName: "Jane Doe", company: "   " })).toBe(false);
  });

  it("flags a URL in the name field", () => {
    expect(detectSpam({ fullName: "http://spam.example" })).toBe(true);
  });

  it("flags 3+ URLs in the description", () => {
    expect(
      detectSpam({
        fullName: "Jane Doe",
        description: "https://a.com https://b.com www.c.com",
      }),
    ).toBe(true);
  });

  it("allows exactly 2 URLs (threshold is 3)", () => {
    expect(
      detectSpam({
        fullName: "Jane Doe",
        description: "see https://a.com and https://b.com",
      }),
    ).toBe(false);
  });

  it("treats a clean submission as not spam", () => {
    expect(
      detectSpam({
        fullName: "Jane Doe",
        description: "Rear-ended at a red light.",
        company: "",
      }),
    ).toBe(false);
  });

  it("handles null/undefined optional fields", () => {
    expect(
      detectSpam({ fullName: "Jane Doe", description: null, company: null }),
    ).toBe(false);
  });
});
