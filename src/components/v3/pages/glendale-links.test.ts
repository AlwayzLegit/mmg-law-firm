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

// OPS-290: the same change for the "Car accidents" and "Truck accidents" cards,
// so the Glendale car and truck pages own "car accident lawyer glendale" and
// "glendale truck accident lawyer" instead of the office page and the statewide
// truck page splitting them. Both Glendale pages are published with their own
// local_angle_md. Links only: the anchor text and every sentence stay as they were.
describe("Glendale office page car and truck links (OPS-290)", () => {
  const source = readFileSync("src/components/v3/pages/glendale.tsx", "utf8");
  const count = (needle: string) => source.split(needle).length - 1;
  const rerun =
    "OPS-290: a re-run of tools/v3-design must keep the Glendale car and truck links";

  it("links the Glendale car page once", () => {
    expect(
      count('href="/locations/los-angeles-county/glendale/car-accidents"'),
      rerun,
    ).toBe(1);
  });

  it("links the Glendale truck page once", () => {
    expect(
      count('href="/locations/los-angeles-county/glendale/truck-accidents"'),
      rerun,
    ).toBe(1);
  });

  it("no longer links the statewide car or truck page from the body", () => {
    expect(count('href="/practice-areas/car-accidents"'), rerun).toBe(0);
    expect(count('href="/practice-areas/truck-accidents"'), rerun).toBe(0);
  });
});
