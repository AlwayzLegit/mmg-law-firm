import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// OPS-44: the health checks (scripts/health/checks.mjs, run by the GitHub probe
// and since OPS-59 by the monitor Worker) fail when the contact
// page shows the verification fallback in place of the Turnstile widget. It
// finds the fallback by one sentence of the notice in turnstile.tsx. The probe's
// self-test runs only on pull requests that touch scripts/health, so a change to
// the notice's wording alone must fail here instead.

const root = process.cwd();
const probeSource = readFileSync(
  join(root, "scripts/health/checks.mjs"),
  "utf8",
);
const componentSource = readFileSync(
  join(root, "src/components/marketing/turnstile.tsx"),
  "utf8",
);

describe("verification fallback marker", () => {
  it("is declared in the health checks", () => {
    expect(probeSource).toMatch(/export const FALLBACK_MARKER = "[^"]+";/);
  });

  it("is still in the notice that turnstile.tsx shows when verification cannot work", () => {
    const marker = /export const FALLBACK_MARKER = "([^"]+)";/.exec(
      probeSource,
    )?.[1];
    expect(marker).toBeTruthy();
    expect(componentSource).toContain(marker!);
  });
});
