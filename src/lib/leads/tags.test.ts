import { describe, expect, it } from "vitest";

import { normalizeTags, tagCounts } from "./tags";

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

describe("tagCounts", () => {
  it("tallies usage across leads", () => {
    expect(
      tagCounts([["vip", "spanish"], ["vip"], ["referral", "vip"]]),
    ).toEqual([
      { tag: "vip", count: 3 },
      { tag: "referral", count: 1 },
      { tag: "spanish", count: 1 },
    ]);
  });

  it("sorts by count desc then alphabetically", () => {
    const out = tagCounts([["b"], ["a"], ["a"], ["c"]]);
    expect(out.map((t) => t.tag)).toEqual(["a", "b", "c"]);
  });

  it("ignores null/garbage entries", () => {
    expect(tagCounts([null, undefined, ["ok"], ["", "ok"]])).toEqual([
      { tag: "ok", count: 2 },
    ]);
  });

  it("returns empty for no leads", () => {
    expect(tagCounts([])).toEqual([]);
  });
});
