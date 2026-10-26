import { describe, expect, it } from "vitest";

import { resolveInternalLinks } from "./internal-links";

const redirects = new Map([
  ["/blog/workplace-retaliation-california-2", "/blog/workplace-retaliation-california"],
  ["/old-page", "/new-page"],
]);

describe("resolveInternalLinks", () => {
  it("rewrites relative links that redirect", () => {
    expect(resolveInternalLinks("See [retaliation](/blog/workplace-retaliation-california-2).", redirects)).toBe(
      "See [retaliation](/blog/workplace-retaliation-california).",
    );
  });

  it("rewrites absolute links on the production origin and keeps hash, query and title", () => {
    expect(
      resolveInternalLinks('[a](https://www.mmg-lawfirm.com/old-page#faq "FAQ") [b](/old-page?x=1)', redirects),
    ).toBe('[a](/new-page#faq "FAQ") [b](/new-page?x=1)');
  });

  it("leaves other links alone", () => {
    const md = "[ok](/blog/other) [ext](https://example.com/old-page) [mail](mailto:a@b.c) [proto](//old-page)";
    expect(resolveInternalLinks(md, redirects)).toBe(md);
  });
});
