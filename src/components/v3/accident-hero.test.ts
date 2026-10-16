import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CAR_HERO, TRUCK_HERO } from "./accident-hero";

describe.each([
  ["car", CAR_HERO, "/v3/photos/car-accident-hero.webp", "CAR_HERO"],
  ["truck", TRUCK_HERO, "/v3/photos/truck-highway-hero.webp", "TRUCK_HERO"],
] as const)("%s hero delivery", (page, hero, artwork, symbol) => {
  it("optimizes unchanged artwork at the configured default quality", () => {
    const src = new URL(hero.src, "https://www.mmg-lawfirm.com");
    expect(src.pathname).toBe("/_next/image");
    expect(src.searchParams.get("url")).toBe(artwork);
    expect(src.searchParams.get("q")).toBe("75");
    expect(hero.style.background).toContain("#12171b");
    expect(hero.style.background).toContain("center/cover no-repeat");
  });

  it("matches preload candidates to the CSS background without raw fallback fetches", () => {
    const candidates = hero.srcSet!.split(", ");
    expect(candidates).toHaveLength(2);
    for (const candidate of candidates) {
      const [url, density] = candidate.split(" ");
      expect(density).toMatch(/^[12]x$/);
      expect(hero.style.backgroundImage).toContain(`url("${url}") ${density}`);
      expect(
        new URL(url, "https://www.mmg-lawfirm.com").searchParams.get("url"),
      ).toBe(artwork);
    }
    const source = readFileSync(`src/components/v3/pages/${page}.tsx`, "utf8");
    expect(source).toContain(`imageSrcSet: ${symbol}.srcSet`);
    expect(source).toContain(`<section style={${symbol}.style}>`);
    expect(source).not.toContain(`preload("${artwork}"`);
    expect(source).not.toContain(`url('${artwork}')`);
    expect(source).not.toContain('"use client"');
  });
});
