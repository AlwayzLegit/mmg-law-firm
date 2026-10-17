import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/image", () => import("@/test/next-image-runtime-config"));
import { MOTO_HERO } from "./moto-hero";

describe("motorcycle hero image delivery", () => {
  it("uses the existing optimizer for the unchanged artwork and allowed quality65", () => {
    const src = new URL(MOTO_HERO.src, "https://www.mmg-lawfirm.com");
    expect(src.pathname).toBe("/_next/image");
    expect(src.searchParams.get("url")).toBe(
      "/v3/moto-photos/motorcycle-coastal-highway-hero.webp",
    );
    expect(src.searchParams.get("q")).toBe("65");
    expect(readFileSync("next.config.ts", "utf8")).toContain(
      "qualities: [65, 75]",
    );
    expect(MOTO_HERO.style.background).toContain("center/cover no-repeat");
  });

  it("uses the same density candidates for preload and CSS image-set", () => {
    const candidates = MOTO_HERO.srcSet!.split(", ");
    expect(candidates).toHaveLength(2);
    for (const candidate of candidates) {
      const [url, density] = candidate.split(" ");
      expect(density).toMatch(/^[12]x$/);
      expect(
        new URL(url, "https://www.mmg-lawfirm.com").searchParams.get("q"),
      ).toBe("65");
      expect(MOTO_HERO.style.backgroundImage).toContain(
        `url("${url}") ${density}`,
      );
    }
    const page = readFileSync("src/components/v3/pages/moto.tsx", "utf8");
    expect(page).toContain("imageSrcSet: MOTO_HERO.srcSet");
    expect(page).toContain("<section style={MOTO_HERO.style}>");
    expect(page).not.toContain('preload("/v3/moto-photos/');
  });
});
