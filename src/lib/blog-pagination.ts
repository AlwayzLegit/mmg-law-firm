/**
 * The blog index is split into pages so it stops growing with every post the
 * content agent publishes (one page listed all ~90 posts: 678 KB of HTML).
 *
 * Page 1 is `/blog`: the newest post as the featured card plus a full grid.
 * Later pages are `/blog/page/<n>` and hold one grid each.
 */
export const BLOG_GRID_SIZE = 24;
const FIRST_PAGE_SIZE = BLOG_GRID_SIZE + 1;

export function blogPageCount(totalPosts: number): number {
  if (totalPosts <= FIRST_PAGE_SIZE) return 1;
  return 1 + Math.ceil((totalPosts - FIRST_PAGE_SIZE) / BLOG_GRID_SIZE);
}

export function blogPagePath(page: number): string {
  return page <= 1 ? "/blog" : `/blog/page/${page}`;
}

/** The posts shown on `page` (1-based); empty when the page does not exist. */
export function blogPageSlice<T>(posts: readonly T[], page: number): T[] {
  if (!Number.isInteger(page) || page < 1) return [];
  if (page === 1) return posts.slice(0, FIRST_PAGE_SIZE);
  const start = FIRST_PAGE_SIZE + (page - 2) * BLOG_GRID_SIZE;
  return posts.slice(start, start + BLOG_GRID_SIZE);
}

/** `"2"` → 2. Anything that is not a plain page number of 2 or more → null. */
export function parseBlogPageParam(value: string): number | null {
  if (!/^[1-9]\d{0,3}$/.test(value)) return null;
  const page = Number(value);
  return page >= 2 ? page : null;
}

/**
 * Up to this many pages, the pager links every page. Each index page is then
 * one click from `/blog`, so every post is within three clicks of the home
 * page. With gaps, posts on a middle page sat four clicks deep (Semrush
 * "page crawl depth", 8 posts on 2026-11-12).
 */
export const PAGER_LINK_ALL_UP_TO = 12;

/**
 * Page numbers to show in the pager: all of them while there are few, then
 * first, last, and those around `current`.
 */
export function blogPagerItems(
  current: number,
  total: number,
): (number | "gap")[] {
  if (total <= PAGER_LINK_ALL_UP_TO)
    return Array.from({ length: Math.max(total, 1) }, (_, i) => i + 1);
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  const pages = [...wanted]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  for (const [i, page] of pages.entries()) {
    if (i > 0 && page - pages[i - 1] > 1) items.push("gap");
    items.push(page);
  }
  return items;
}
