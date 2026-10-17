import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/components/v3/v3.css", "utf8").replaceAll("\r\n", "\n");
const tabSelector = '.v3-page a:is([style*="writing-mode:vertical-rl"], [style*="writing-mode: vertical-rl"]):is([style*="position:fixed"], [style*="position: fixed"])';
const spanSelector = '.v3-page :is([style*="grid-template-columns:repeat(auto-fit"], [style*="grid-template-columns: repeat(auto-fit"]) > :is([style*="grid-column:span 2"], [style*="grid-column: span 2"])';
const stageSelector = '.v3-page :is([style*="grid-template-columns:44px 48px minmax(150px,220px) 1fr auto"], [style*="grid-template-columns: 44px 48px minmax(150px, 220px) 1fr auto"])';
const deadlineSelector = '.v3-page :is([style*="grid-template-columns:56px minmax(130px,170px) 1fr"], [style*="grid-template-columns: 56px minmax(130px, 170px) 1fr"])';

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

  it.each([210, 220])("matches the %i-pixel portrait column after CSSOM normalization", (width) => {
    expect(css).toContain(`[style*="grid-template-columns:minmax(0,${width}px) 1fr"]`);
    expect(css).toContain(`[style*="grid-template-columns: minmax(0px, ${width}px) 1fr"]`);
  });

  it("keeps claim summaries and detail controls on full-width phone rows", () => {
    expect(css).toContain(`${stageSelector} {\n    grid-template-columns: 44px 48px 1fr !important;\n    row-gap: 8px !important;\n  }`);
    expect(css).toContain(`${stageSelector} > :nth-child(n + 4) {\n    grid-column: 1 / -1;\n  }`);
  });

  it("preserves the separate tablet claim-stage layout and breakpoint", () => {
    expect(css).toContain(`@media (min-width: 481px) and (max-width: 900px) {\n  ${stageSelector} {\n    grid-template-columns: 44px 48px minmax(0, 1fr) auto !important;\n    row-gap: 8px !important;\n  }\n  ${stageSelector} > :nth-child(4) {\n    grid-column: 3 / -1;\n    grid-row: 2;\n  }\n}`);
  });

  it("keeps deadline detail copy below the title on phones", () => {
    expect(css).toContain(`@media (max-width: 480px) {\n  /* Deadline cards (number | claim | detail). */\n  ${deadlineSelector} {\n    grid-template-columns: 44px minmax(0, 1fr) !important;\n    row-gap: 8px !important;\n  }\n  ${deadlineSelector} > :nth-child(n + 3) {\n    grid-column: 1 / -1;\n  }`);
  });

  it("keeps truck deadline labels readable and places values below them", () => {
    const truckSelector = '.v3-page :is([style*="grid-template-columns:28px 1fr auto"], [style*="grid-template-columns: 28px 1fr auto"])';
    expect(css).toContain(`${truckSelector} {\n    grid-template-columns: 28px minmax(0, 1fr) !important;\n    row-gap: 4px !important;\n  }\n  ${truckSelector} > :nth-child(3) {\n    grid-column: 2;\n  }`);
  });

  it("matches independent parent and child serialization for the reviews tablet grid", () => {
    expect(css).toContain('@media (max-width: 1279px) {\n  .v3-page :is([style*="minmax(min(100%,420px),1fr))"], [style*="minmax(min(100%, 420px), 1fr))"]):has(> :is([style*="grid-template-columns:minmax(0,220px) 1fr"], [style*="grid-template-columns: minmax(0px, 220px) 1fr"])) {\n    grid-template-columns: minmax(0, 1fr) !important;\n  }\n}');
  });
});
