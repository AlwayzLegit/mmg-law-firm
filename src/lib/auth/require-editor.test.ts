import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Intake accounts are read-only outside leads. These server actions change
// content, media or firm settings, mostly through the service role, so the
// requireEditor() call is the only thing that stops an intake account.
const EDITOR_ACTIONS = [
  "case-results/actions.ts",
  "content/agent/actions.ts",
  "content/agent/topics/actions.ts",
  "content/attorneys/actions.ts",
  "content/blog/actions.ts",
  "content/cities/actions.ts",
  "content/counties/actions.ts",
  "content/legal/actions.ts",
  "content/location-pages/actions.ts",
  "content/practice-areas/actions.ts",
  "content/redirects/actions.ts",
  "content/testimonials/actions.ts",
  "media/actions.ts",
  "settings/firm/actions.ts",
  "settings/templates/actions.ts",
];

// Sections intake can browse but not edit. Their layouts disable the controls.
const READ_ONLY_LAYOUTS = [
  "content/layout.tsx",
  "case-results/layout.tsx",
  "media/layout.tsx",
  "settings/firm/layout.tsx",
  "settings/templates/layout.tsx",
];

const read = (p: string) => readFileSync(`src/app/(admin)/admin/${p}`, "utf8");

describe("intake is read-only outside leads", () => {
  it.each(EDITOR_ACTIONS)("%s gates every action with requireEditor()", (file) => {
    const src = read(file);
    expect(src).not.toMatch(/\brequireAdmin\(/);
    const actions = src.match(/^export async function \w+/gm) ?? [];
    const gated = src.match(/await requireEditor\(\)/g) ?? [];
    // *AndRedirect wrappers delegate to a gated action.
    const wrappers = actions.filter((a) => a.endsWith("AndRedirect")).length;
    expect(gated.length).toBeGreaterThanOrEqual(actions.length - wrappers);
  });

  it.each(READ_ONLY_LAYOUTS)("%s wraps its pages in ReadOnlyForIntake", (file) => {
    expect(read(file)).toContain("<ReadOnlyForIntake>");
  });
});
