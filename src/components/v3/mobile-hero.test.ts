import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/image", () => import("@/test/next-image-runtime-config"));
import { CAR_HERO, TRUCK_HERO } from "./accident-hero";
import { MOTO_HERO } from "./moto-hero";

describe.each([
  ["car", CAR_HERO, "CAR_HERO"],
  ["truck", TRUCK_HERO, "TRUCK_HERO"],
  ["moto", MOTO_HERO, "MOTO_HERO"],
] as const)("%s hero on phones", (page, hero, name) => {
  it("has a 1200px quality-65 mobile image, set as --hero-mobile", () => {
    const url = new URL(hero.mobileSrc, "https://www.mmg-lawfirm.com");
    expect(url.pathname).toBe("/_next/image");
    expect(url.searchParams.get("w")).toBe("1200");
    expect(url.searchParams.get("q")).toBe("65");
    expect(hero.style["--hero-mobile"]).toBe(`url("${hero.mobileSrc}")`);
  });

  it("preloads the desktop set on desktop only and the mobile image on phones only", () => {
    const src = readFileSync(`src/components/v3/pages/${page}.tsx`, "utf8");
    expect(src).toContain(`imageSrcSet: ${name}.srcSet, media: DESKTOP_HERO_MEDIA`);
    expect(src).toContain(`preload(${name}.mobileSrc, { as: "image", fetchPriority: "high", media: MOBILE_HERO_MEDIA })`);
  });
});

it("swaps the mobile hero in below md, over the inline style", () => {
  const css = readFileSync("src/components/v3/v3.css", "utf8");
  expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*?--hero-mobile[\s\S]*?var\(--hero-mobile\) !important/);
});
