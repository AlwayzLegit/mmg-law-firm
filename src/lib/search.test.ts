import { describe, expect, it } from "vitest";

import { sanitizeSearchTerm, slugish } from "./search";

describe("sanitizeSearchTerm", () => {
  it("passes through ordinary text", () => {
    expect(sanitizeSearchTerm("John Doe")).toBe("John Doe");
  });

  it("strips PostgREST/ilike metacharacters", () => {
    expect(sanitizeSearchTerm("a%b_c,d(e)f")).toBe("a b c d e f".trim());
  });

  it("neutralizes an .or() injection attempt", () => {
    // A naive term that tries to inject an extra OR condition becomes inert.
    const out = sanitizeSearchTerm("x,status.eq.signed");
    expect(out).not.toContain(",");
    expect(out).not.toContain("(");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeSearchTerm("  hello  ")).toBe("hello");
  });

  it("caps length at 80 characters", () => {
    expect(sanitizeSearchTerm("a".repeat(200))).toHaveLength(80);
  });

  it("returns an empty string for empty input", () => {
    expect(sanitizeSearchTerm("")).toBe("");
  });
});

describe("slugish", () => {
  it("keeps slug-safe characters", () => {
    expect(slugish("los-angeles_county.1")).toBe("los-angeles_county.1");
  });

  it("drops disallowed characters", () => {
    expect(slugish("car/accidents?x=1")).toBe("caraccidentsx1");
  });

  it("handles undefined", () => {
    expect(slugish(undefined)).toBe("");
  });

  it("caps length at 80 characters", () => {
    expect(slugish("a".repeat(200))).toHaveLength(80);
  });
});
