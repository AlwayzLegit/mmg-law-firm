import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/components/v3/v3.css", "utf8").replaceAll("\r\n", "\n");
const tabSelector = '.v3-page a:is([style*="writing-mode:vertical-rl"], [style*="writing-mode: vertical-rl"]):is([style*="position:fixed"], [style*="position: fixed"])';
const spanSelector = '.v3-page :is([style*="grid-template-columns:repeat(auto-fit"], [style*="grid-template-columns: repeat(auto-fit"]) > :is([style*="grid-column:span 2"], [style*="grid-column: span 2"])';

describe("responsive navigation selector contract", () => {
  it("keeps fixed vertical tabs hidden only below the desktop breakpoint", () => {
    expect(css).toContain(`@media (max-width: 1199px) {\n  /* Navigation creates CSSOM-spaced style attributes, unlike compact SSR. */\n  ${tabSelector} {\n    display: none !important;\n  }\n}`);
  });

  it("keeps only direct span-two children inside the one-column mobile grid", () => {
    expect(css).toContain(`@media (max-width: 700px) {\n  /* Match both server HTML and client-navigation serialization. */\n  ${spanSelector} {\n    grid-column: 1 / -1 !important;\n  }\n}`);
  });

  it.each(["", " "])("includes %j spacing for each independent attribute", (space) => {
    expect(tabSelector).toContain(`[style*="writing-mode:${space}vertical-rl"]`);
    expect(tabSelector).toContain(`[style*="position:${space}fixed"]`);
    expect(spanSelector).toContain(`[style*="grid-template-columns:${space}repeat(auto-fit"]`);
    expect(spanSelector).toContain(`[style*="grid-column:${space}span 2"]`);
  });

  it("does not replace responsive repair with document clipping", () => {
    expect(css).not.toMatch(/(?:html|body|\.theme-v3|\.v3-page)\s*\{[^}]*overflow-x\s*:\s*(?:hidden|clip)/);
  });
});
