import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import { describe, expect, it } from "vitest";
import { BLOG_MARKDOWN_COMPONENTS } from "./markdown-components";

describe("blog body heading hierarchy", () => {
  it("preserves body title wording and anchors without adding a second H1", () => {
    const html = renderToStaticMarkup(
      createElement(ReactMarkdown, {
        components: BLOG_MARKDOWN_COMPONENTS,
        rehypePlugins: [rehypeSlug],
        children:
          "# California accident guidance\n\nExisting legal wording.\n\n## Evidence\n\n### Photos",
      }),
    );
    expect(html).not.toContain("<h1");
    expect(html).toContain(
      '<h2 id="california-accident-guidance">California accident guidance</h2>',
    );
    expect(html).toContain("Existing legal wording.");
    expect(html).toContain('<h2 id="evidence">Evidence</h2>');
    expect(html).toContain('<h3 id="photos">Photos</h3>');
  });
});
