import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/image", () => import("@/test/next-image-runtime-config"));
import { CAR_HERO, TRUCK_HERO } from "./accident-hero";

describe.each([
  ["car", CAR_HERO, "/v3/photos/car-accident-hero.webp", "CAR_HERO"],
  ["truck", TRUCK_HERO, "/v3/photos/truck-highway-hero.webp", "TRUCK_HERO"],
] as const)("%s hero delivery", (page, hero, artwork, symbol) => {
  it("optimizes unchanged artwork at the existing allowed quality65", () => {
    const src = new URL(hero.src, "https://www.mmg-lawfirm.com");
    expect(src.pathname).toBe("/_next/image");
    expect(src.searchParams.get("url")).toBe(artwork);
    expect(src.searchParams.get("q")).toBe("65");
    expect(readFileSync("next.config.ts", "utf8")).toContain(
      "qualities: [65, 75]",
    );
    expect(hero.style.background).toContain("#12171b");
    expect(hero.style.background).toContain("center/cover no-repeat");
  });

  it("matches preload candidates to the CSS background without raw fallback fetches", () => {
    const candidates = hero.srcSet!.split(", ");
    expect(candidates).toHaveLength(2);
    for (const candidate of candidates) {
      const [url, density] = candidate.split(" ");
      expect(density).toMatch(/^[12]x$/);
      expect(
        new URL(url, "https://www.mmg-lawfirm.com").searchParams.get("q"),
      ).toBe("65");
      expect(hero.style.backgroundImage).toContain(`url("${url}") ${density}`);
      expect(
        new URL(url, "https://www.mmg-lawfirm.com").searchParams.get("url"),
      ).toBe(artwork);
    }
    const source = readFileSync(`src/components/v3/pages/${page}.tsx`, "utf8");
    expect(source).toContain(`<HeroPreload hero={${symbol}} />`);
    expect(readFileSync("src/components/v3/hero-preload.tsx", "utf8")).toContain("imageSrcSet={hero.srcSet}");
    expect(source).toContain(`<section style={${symbol}.style}>`);
    expect(source).not.toContain(`preload("${artwork}"`);
    expect(source).not.toContain(`url('${artwork}')`);
    expect(source).not.toContain('"use client"');
  });
});
