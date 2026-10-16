import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/components/v3/v3.css", "utf8").replaceAll("\r\n", "\n");
const image = '.v3-page :is([style*="width:min(46%,700px)"], [style*="width: min(46%, 700px)"])';
const copy = '.v3-page :is([style*="padding:40px clamp(20px,5.8vw,90px) 40px clamp(20px,20vw,310px)"], [style*="padding: 40px clamp(20px, 5.8vw, 90px) 40px clamp(20px, 20vw, 310px)"])';
const cards = '.v3-page ul:is([style*="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))"], [style*="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))"]):is([style*="gap:1px"], [style*="gap: 1px"]):has(> li:nth-child(5):last-child)';

// Source contracts supplement breakpoint and client-navigation browser checks.
describe("closing band and resource cards navigation consistency", () => {
  it("retains the mobile background and copy treatment at the original breakpoint", () => {
    expect(css).toContain(`@media (max-width: 767px) {\n  ${image} {\n    width: 100% !important;\n    opacity: 0.18 !important;\n  }\n  ${copy} {\n    padding-left: 20px !important;\n    padding-right: 20px !important;\n  }\n}`);
  });

  it("preserves the five-card three-plus-two composition only at tablet widths", () => {
    expect(css).toContain(`@media (min-width: 700px) and (max-width: 1279px) {\n  ${cards} {\n    grid-template-columns: repeat(6, minmax(0, 1fr)) !important;\n  }\n  ${cards} > li {\n    grid-column: span 2;\n  }\n  ${cards} > li:nth-child(n + 4) {\n    grid-column: span 3;\n  }\n}`);
  });

  it.each(["", " "])("matches independent gap serialization with %j spacing", (space) => {
    expect(cards).toContain(`[style*="gap:${space}1px"]`);
    expect(cards).toContain(":has(> li:nth-child(5):last-child)");
  });
});
