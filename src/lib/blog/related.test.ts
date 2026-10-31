import { describe, expect, it } from "vitest";

import type { BlogPostSummary } from "@/lib/data/blog";

import { relatedPosts, relatedPostsMap } from "./related";

const post = (slug: string, tags: string[], day = 1) =>
  ({ slug, title: slug, tags, published_at: `2026-01-${String(day).padStart(2, "0")}T00:00:00Z` }) as BlogPostSummary;

describe("relatedPosts", () => {
  it("prefers tag overlap and never returns the post itself", () => {
    const all = [post("a", ["car"]), post("b", ["car", "injury"]), post("c", ["wage"], 28), post("d", ["injury"])];
    const r = relatedPosts(all[0], all, 2).map((p) => p.slug);
    expect(r[0]).toBe("b");
    expect(r).not.toContain("a");
    expect(relatedPosts(all[0], all, 2)).toEqual(relatedPosts(all[0], all, 2));
  });

  it("spreads links across equally related posts instead of the newest few", () => {
    const all = Array.from({ length: 40 }, (_, i) => post(`p${i}`, ["car"], (i % 28) + 1));
    const inbound = new Map<string, number>();
    for (const p of all)
      for (const r of relatedPosts(p, all, 3)) inbound.set(r.slug, (inbound.get(r.slug) ?? 0) + 1);
    expect(inbound.size).toBeGreaterThanOrEqual(30);
    expect(Math.max(...inbound.values())).toBeLessThanOrEqual(10);
  });

  it("links every post from some other post even when tags are uneven", () => {
    // A heavily tagged cluster that ranking alone would always prefer.
    const hub = Array.from({ length: 10 }, (_, i) => post(`hub${i}`, ["car", "injury", "insurance"]));
    const edge = Array.from({ length: 8 }, (_, i) => post(`edge${i}`, ["car"]));
    const all = [...hub, ...edge];
    const map = relatedPostsMap(all, 3);
    const inbound = new Set([...map.values()].flat().map((p) => p.slug));
    for (const p of all) expect(inbound).toContain(p.slug);
    for (const [slug, list] of map) {
      expect(list).toHaveLength(3);
      expect(list.map((p) => p.slug)).not.toContain(slug);
      expect(new Set(list.map((p) => p.slug)).size).toBe(3);
    }
    expect(relatedPosts(edge[0], all, 3)).toEqual(map.get("edge0"));
  });
});
