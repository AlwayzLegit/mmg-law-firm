import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IntroEmphasis } from "./intro-emphasis";

const render = (text: string) =>
  renderToStaticMarkup(createElement("p", null, createElement(IntroEmphasis, { text })));

describe("city introduction emphasis", () => {
  it("renders existing balanced bold markers with unchanged words", () => {
    expect(render("Near **State Route 68**, contact **MMG**."))
      .toBe("<p>Near <strong>State Route 68</strong>, contact <strong>MMG</strong>.</p>");
  });

  it("preserves plain introductions, whitespace and unmatched markers", () => {
    for (const text of ["Plain introduction.", "First paragraph.\n\nSecond paragraph.", "Unmatched **marker", "**line\nbreak**", "****", ""])
      expect(render(text)).toBe(`<p>${text}</p>`);
  });

  it("does not introduce headings, links, blocks or executable HTML", () => {
    expect(render('**<script>alert(1)</script>** [link](javascript:alert(1))'))
      .toBe('<p><strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong> [link](javascript:alert(1))</p>');
    expect(render("# Not a heading\n**bold**")).toBe("<p># Not a heading\n<strong>bold</strong></p>");
  });
});
