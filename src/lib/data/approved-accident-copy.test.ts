import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DMV_REPORT_CHECKLIST, DMV_REPORT_LINK_TEXT, INJURY_DEADLINE_NOTE, TRUCK_EVIDENCE_EXPLANATION } from "./approved-accident-copy";
import { PRACTICE_AREA_CONTENT, getAttorneyHelp } from "./practice-area-content";
import { sharedContentRevision } from "../seo/content-revisions";

describe("approved accident-copy corrections", () => {
  it("separates DMV reporting from police and insurance reports", () => {
    expect(PRACTICE_AREA_CONTENT["car-accidents"].whatToDo).toContain(DMV_REPORT_CHECKLIST);
    expect(DMV_REPORT_CHECKLIST).toContain("within 10 days");
    expect(DMV_REPORT_CHECKLIST).toContain("exceeds $1,000");
    expect(DMV_REPORT_CHECKLIST).toContain("separate from a police, CHP, or insurance report");
    expect(DMV_REPORT_CHECKLIST.endsWith(DMV_REPORT_LINK_TEXT)).toBe(true);
    expect(PRACTICE_AREA_CONTENT["car-accidents"].whatToDo.join(" ")).not.toContain("or, for minor crashes");
  });

  it("uses the exact approved truck paragraph without categorical outcomes", () => {
    expect(getAttorneyHelp("truck-accidents", "truck accident")).toBe(TRUCK_EVIDENCE_EXPLANATION);
    expect(TRUCK_EVIDENCE_EXPLANATION).not.toContain("won or lost");
    expect(TRUCK_EVIDENCE_EXPLANATION).toContain("does not, by itself");
  });

  it("keeps the approved deadline qualification in server and interactive copy", () => {
    const callout = readFileSync("src/components/marketing/deadlines-callout.tsx", "utf8");
    const tools = readFileSync("src/components/v3/v3-resource-tools.tsx", "utf8");
    const resources = readFileSync("src/components/v3/pages/resources.tsx", "utf8");
    expect(callout).toContain("isEmployment ? <p>");
    expect(callout).toContain("</p> : <p>{INJURY_DEADLINE_NOTE}</p>");
    expect(tools).toContain("e.textContent = INJURY_DEADLINE_NOTE");
    expect(tools).not.toContain("appears to have closed");
    expect(resources).toContain("{INJURY_DEADLINE_NOTE}");
    expect(INJURY_DEADLINE_NOTE).not.toContain("continuing violations");
    expect(INJURY_DEADLINE_NOTE).toContain("separate lawsuit deadlines");
  });

  it("limits sitemap revision dates to pages with the changed shared content", () => {
    for (const path of ["/resources", "/practice-areas/bicycle-accidents", "/locations/mono-county/mammoth-lakes/car-accidents", "/locations/a/b/truck-accidents", "/locations/a/b/dog-bites"])
      expect(sharedContentRevision(path)).toBe("2026-10-16");
    for (const path of ["/", "/blog/example", "/practice-areas/car-accidents", "/locations/a/b/employment-law", "/locations/a/b", "/locations/a/b/unknown"])
      expect(sharedContentRevision(path)).toBeUndefined();
  });
});
