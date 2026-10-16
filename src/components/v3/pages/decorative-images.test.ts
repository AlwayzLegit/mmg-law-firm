import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (page: string) =>
  readFileSync(`src/components/v3/pages/${page}.tsx`, "utf8");

describe("offscreen accident-page decoration", () => {
  it.each([
    ["car", "mmg-office-desk", "center"],
    ["car", "california-hillside-banner", "left center"],
    ["truck", "truck-evidence-desk", "center"],
    ["truck", "truck-roadside-warning", "70% center"],
  ])("%s defers %s without changing its artwork or crop", (page, file, position) => {
    const text = source(page);
    const tag = text.match(new RegExp(`<Image src="/v3/photos/${file}\\.webp"[^>]+>`))?.[0];
    expect(tag).toBeDefined();
    expect(tag).toContain('alt=""');
    expect(tag).toContain('aria-hidden="true"');
    expect(tag).toContain(' fill loading="lazy" sizes="');
    expect(tag).toContain('objectFit:"cover"');
    expect(tag).toContain(`objectPosition:"${position}"`);
    expect(tag).toContain('pointerEvents:"none"');
    expect(tag).not.toContain("preload");
    expect(tag).not.toContain("priority");
    expect(text).not.toContain(`url('/v3/photos/${file}.webp')`);
  });

  it("keeps the reserved office-image space and decorative masks", () => {
    expect(source("car")).toContain('minHeight:"520px",background:"#1b2228",position:"relative"');
    expect(source("car")).toContain('maskImage:"linear-gradient(to right,#000 30%,transparent)"');
    expect(source("truck").match(/maskImage:"linear-gradient\(to right,transparent,#000 35%\)"/g)).toHaveLength(2);
  });

  it("matches the hillside image's full-width phone layout", () => {
    expect(source("car")).toContain('sizes="(max-width: 767px) 100vw, (max-width: 1522px) 46vw, 700px"');
  });

  it.each(["car", "truck"])("keeps %s hero loading eager and prioritized", (page) => {
    const file = page === "car" ? "car-accident-hero" : "truck-highway-hero";
    const text = source(page);
    expect(text).toContain(`preload("/v3/photos/${file}.webp", { as: "image", fetchPriority: "high" });`);
    expect(text).toContain(`url('/v3/photos/${file}.webp') center/cover no-repeat`);
  });
});
