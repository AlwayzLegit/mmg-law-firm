import { describe, expect, it } from "vitest";

import { fitMetaDescription } from "./metadata";

describe("fitMetaDescription", () => {
  it("leaves short descriptions alone", () => {
    expect(fitMetaDescription("Free consultation.  Call today.")).toBe("Free consultation. Call today.");
  });

  it("keeps whole sentences that fit", () => {
    const a = "A".repeat(90) + ".";
    const b = "B".repeat(80) + ".";
    expect(fitMetaDescription(`${a} ${b}`)).toBe(a);
  });

  it("cuts a single long sentence at a word boundary with an ellipsis", () => {
    const text = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
    const out = fitMetaDescription(text);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
});
