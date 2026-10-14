import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { V3_GUIDES, V3_PAGES } from "./pages";

/**
 * The guide and practice-hub page maps are split out of a single registry so
 * each route only bundles the page bodies it can render. These tests keep the
 * maps in step with the page registry. They read the map sources as text so
 * the generated page bodies (JSX, next/image, client islands) aren't loaded
 * into the Node test environment.
 */
function mapKeys(file: string): string[] {
  const src = fs.readFileSync(path.resolve(__dirname, "../../components/v3", file), "utf8");
  const body = src.slice(src.indexOf("= {"));
  return [...body.matchAll(/^\s+(\w+): V3\w+Page,$/gm)].map((m) => m[1]).sort();
}

describe("v3 page maps", () => {
  it("lists every root-level guide exactly once", () => {
    expect(mapKeys("guide-pages.ts")).toEqual(V3_GUIDES.map((p) => p.key).sort());
  });

  it("lists every practice-area hub that has a v3 design", () => {
    const hubs = V3_PAGES.filter((p) => p.path.startsWith("/practice-areas/")).map((p) => p.key);
    expect(mapKeys("practice-pages.ts")).toEqual(hubs.sort());
  });

  it("points every mapped key at an existing generated page body", () => {
    const pagesDir = path.resolve(__dirname, "../../components/v3/pages");
    for (const key of [...mapKeys("guide-pages.ts"), ...mapKeys("practice-pages.ts")]) {
      expect(fs.existsSync(path.join(pagesDir, `${key}.tsx`))).toBe(true);
    }
  });
});
