import { describe, expect, it } from "vitest";

import {
  BLOG_GRID_SIZE,
  blogPageCount,
  blogPagePath,
  blogPageSlice,
  blogPagerItems,
  parseBlogPageParam,
} from "./blog-pagination";

const posts = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("blog pagination", () => {
  it("keeps everything on one page up to a featured post plus one grid", () => {
    expect(blogPageCount(0)).toBe(1);
    expect(blogPageCount(1)).toBe(1);
    expect(blogPageCount(BLOG_GRID_SIZE + 1)).toBe(1);
    expect(blogPageCount(BLOG_GRID_SIZE + 2)).toBe(2);
    expect(blogPageCount(91)).toBe(4);
  });

  it("shows every post exactly once, in order, across the pages", () => {
    for (const total of [0, 1, 25, 26, 49, 50, 91, 200]) {
      const all = posts(total);
      const pages = blogPageCount(total);
      const shown = Array.from({ length: pages }, (_, i) =>
        blogPageSlice(all, i + 1),
      );
      expect(shown.flat()).toEqual(all);
      // No page after the first is empty, and none overflows its grid.
      for (const page of shown.slice(1)) {
        expect(page.length).toBeGreaterThan(0);
        expect(page.length).toBeLessThanOrEqual(BLOG_GRID_SIZE);
      }
      expect(blogPageSlice(all, pages + 1)).toEqual([]);
    }
  });

  it("rejects page numbers that are not whole and positive", () => {
    expect(blogPageSlice(posts(91), 0)).toEqual([]);
    expect(blogPageSlice(posts(91), -1)).toEqual([]);
    expect(blogPageSlice(posts(91), 1.5)).toEqual([]);
  });

  it("uses /blog for page 1 and /blog/page/n after it", () => {
    expect(blogPagePath(1)).toBe("/blog");
    expect(blogPagePath(2)).toBe("/blog/page/2");
  });

  it("parses only plain page numbers of 2 or more", () => {
    expect(parseBlogPageParam("2")).toBe(2);
    expect(parseBlogPageParam("14")).toBe(14);
    for (const bad of ["1", "0", "02", "-2", "2.0", "2a", "", " 2", "99999"])
      expect(parseBlogPageParam(bad)).toBeNull();
  });

  it("lists first, last and neighbouring pages with gaps", () => {
    expect(blogPagerItems(1, 1)).toEqual([1]);
    expect(blogPagerItems(1, 4)).toEqual([1, 2, "gap", 4]);
    expect(blogPagerItems(3, 4)).toEqual([1, 2, 3, 4]);
    expect(blogPagerItems(5, 9)).toEqual([1, "gap", 4, 5, 6, "gap", 9]);
  });
});
