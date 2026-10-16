import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PRACTICE_AREAS } from "./practice-areas";
import {
  PRACTICE_AREA_OPTIONS,
  practiceFromLabel,
} from "./practice-area-options";
import { LeadSchema } from "@/lib/validation/lead";

function previousMatch(label: string) {
  const l = label.toLowerCase();
  return PRACTICE_AREAS.find(
    (p) =>
      l.includes(p.shortName.toLowerCase()) ||
      l.includes(p.name.toLowerCase().replace(/ accidents?$/, "")),
  )?.slug;
}

describe("form-only practice catalog", () => {
  it("preserves every option label, submitted slug, short name and order", () => {
    expect(PRACTICE_AREA_OPTIONS).toEqual(
      PRACTICE_AREAS.map(({ slug, name, shortName }) => ({
        slug,
        name,
        shortName,
      })),
    );
  });

  it.each(PRACTICE_AREAS)("preserves matching for $slug", (area) => {
    for (const label of [
      area.name,
      area.shortName,
      area.name.toUpperCase(),
      `Help with ${area.shortName}`,
      `${area.name} / another matter`,
    ]) {
      expect(practiceFromLabel(label)).toBe(previousMatch(label));
    }
  });

  it.each(["", "Other", "Unlisted matter", "Car Accident or Truck Accident"])(
    "preserves fallback/first-match behavior for %j",
    (label) => {
      expect(practiceFromLabel(label)).toBe(previousMatch(label));
    },
  );

  it.each(["marketing/lead-form.tsx", "v3/v3-lead-form.tsx"])(
    "keeps the descriptive catalog out of %s",
    (file) => {
      const source = fs.readFileSync(
        path.join(process.cwd(), "src/components", file),
        "utf8",
      );
      expect(source).toContain('from "@/lib/data/practice-area-options"');
      expect(source).not.toContain('from "@/lib/data/practice-areas"');
    },
  );

  it("does not reimport the full catalog at runtime", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/data/practice-area-options.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/(?:import|export)\s.*\bfrom\b/);
    for (const option of PRACTICE_AREA_OPTIONS) {
      expect(Object.keys(option).sort()).toEqual(["name", "shortName", "slug"]);
    }
  });

  it("preserves client/server validation's allowed practice values", () => {
    const field = LeadSchema.shape.practice_area;
    for (const area of PRACTICE_AREAS) {
      expect(field.parse(area.slug)).toBe(area.slug);
    }
    expect(field.parse(undefined)).toBeUndefined();
    for (const value of ["", "not-a-practice", "Car Accidents", null, 123]) {
      expect(field.safeParse(value).success).toBe(false);
    }
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/validation/lead.ts"),
      "utf8",
    );
    expect(source).not.toContain('from "@/lib/data/practice-areas"');
  });
});
