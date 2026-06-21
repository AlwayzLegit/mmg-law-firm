import { describe, expect, it } from "vitest";

import { normalizeTags } from "./tags";

describe("normalizeTags", () => {
  it("trims and lower-cases", () => {
    expect(normalizeTags(["  Spanish  ", "High-Value"])).toEqual([
      "spanish",
      "high-value",
    ]);
  });

  it("collapses internal whitespace", () => {
    expect(normalizeTags(["needs   translator"])).toEqual(["needs translator"]);
  });

  it("drops empties and whitespace-only entries", () => {
    expect(normalizeTags(["", "   ", "referral"])).toEqual(["referral"]);
  });

  it("de-duplicates case-insensitively, preserving first order", () => {
    expect(normalizeTags(["VIP", "vip", "Referral", "referral"])).toEqual([
      "vip",
      "referral",
    ]);
  });

  it("caps each tag at 30 characters", () => {
    expect(normalizeTags(["x".repeat(50)][0] ? ["x".repeat(50)] : [])).toEqual([
      "x".repeat(30),
    ]);
  });

  it("caps the list at 20 tags", () => {
    const many = Array.from({ length: 30 }, (_, i) => `tag-${i}`);
    expect(normalizeTags(many)).toHaveLength(20);
  });

  it("returns an empty array for no input", () => {
    expect(normalizeTags([])).toEqual([]);
  });
});
