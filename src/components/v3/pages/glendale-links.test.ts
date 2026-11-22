import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// OPS-280: the Glendale office page's "Motorcycle accidents" card points at the
// published Glendale motorcycle page, so one page owns the search
// "motorcycle accident lawyer glendale". glendale.tsx is generated from
// tools/v3-design; a re-run overwrites it. If this test fails after a re-run,
// put the link target back (see tools/v3-design/README.md).
describe("Glendale office page motorcycle link (OPS-280)", () => {
  const source = readFileSync("src/components/v3/pages/glendale.tsx", "utf8");
  const count = (needle: string) => source.split(needle).length - 1;

  it("links the Glendale motorcycle page once", () => {
    expect(
      count(
        'href="/locations/los-angeles-county/glendale/motorcycle-accidents"',
      ),
      "OPS-280: a re-run of tools/v3-design must keep the Glendale motorcycle link",
    ).toBe(1);
  });

  it("no longer links the statewide motorcycle page from the body", () => {
    expect(
      count('href="/practice-areas/motorcycle-accidents"'),
      "OPS-280: a re-run of tools/v3-design must keep the Glendale motorcycle link",
    ).toBe(0);
  });
});
