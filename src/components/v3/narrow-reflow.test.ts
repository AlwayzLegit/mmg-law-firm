import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const chrome = readFileSync("src/components/v3/v3-chrome.css", "utf8").replaceAll("\r\n", "\n");
const page = readFileSync("src/components/v3/v3.css", "utf8").replaceAll("\r\n", "\n");

// Source contracts supplement real cold/client-navigation browser checks.
describe("narrow-screen reflow contracts", () => {
  it("changes header spacing only below 360px", () => {
    expect(chrome).toContain("@media (max-width: 359px) {\n  .v3h-bar {\n    padding-inline: 10px;\n    gap: 8px;\n  }\n}");
  });

  it("retains the readable wordmark and 44px navigation targets", () => {
    expect(chrome).toContain("min-width: 180px;");
    expect(chrome).toContain(".v3h-burger {\n  list-style: none;\n  width: 44px;\n  height: 44px;");
    expect(chrome).toContain(".v3h-phone {\n    min-width: 44px;\n    min-height: 44px;");
  });

  it("stacks only the truck consultation panel, in either style serialization", () => {
    expect(page).toContain('@media (max-width: 359px) {\n  .v3-page :is([style*="grid-template-columns:auto 1fr"], [style*="grid-template-columns: auto 1fr"]):has(> div > a[href="#truck-form"]) {\n    grid-template-columns: minmax(0, 1fr) !important;\n  }\n}');
  });

  it("does not conceal overflow or remove the consultation control", () => {
    expect(chrome + page).not.toMatch(/(?:html|body|\.theme-v3|\.v3-page|\.v3h)\s*\{[^}]*overflow-x\s*:\s*(?:hidden|clip)/);
    expect(page).not.toMatch(/a\[href="#truck-form"\][^{]*\{[^}]*display\s*:\s*none/);
  });
});
