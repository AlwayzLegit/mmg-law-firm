import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { needsToastHost } from "./toast-route-policy";

describe("toast loading scope", () => {
  it.each(["car", "truck", "motorcycle"])("skips only the %s hub on an initial load", (slug) => {
    expect(needsToastHost(`/practice-areas/${slug}-accidents`)).toBe(false);
  });
  it.each([null, "/", "/contact", "/login", "/onboarding", "/admin/today", "/blog/example", "/practice-areas/employment-law", "/locations/monterey-county/salinas/motorcycle-accidents", "/practice-areas/car-accidents/new"])("preserves notifications for %s", (path) => {
    expect(needsToastHost(path)).toBe(true);
  });
  it("guards the hub and shared chrome dependency graphs against future toast producers", () => {
    const visited = new Set<string>();
    function walk(file: string) {
      file = resolve(file);
      if (visited.has(file)) return;
      visited.add(file);
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/(?:from\s*|import\s*\()['"]sonner['"]/);
      // Include static imports/re-exports and dynamic imports of local modules.
      for (const match of source.matchAll(/(?:from\s*|import\s*\()['"]([^'"]+)['"]/g)) {
        const spec = match[1];
        if (!spec.startsWith("@/") && !spec.startsWith(".")) continue;
        const base = spec.startsWith("@/") ? resolve("src", spec.slice(2)) : resolve(dirname(file), spec);
        const next = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find(p => existsSync(p) && /\.(?:ts|tsx)$/.test(p));
        if (next) walk(next);
      }
    }
    for (const root of ["pages/car.tsx", "pages/truck.tsx", "pages/moto.tsx", "v3-header.tsx", "v3-footer.tsx", "v3-mobile-dock.tsx", "v3-runtime.tsx", "v3-city-links.tsx"])
      walk(`src/components/v3/${root}`);
    expect(visited.size).toBeGreaterThan(20);
  });
});
