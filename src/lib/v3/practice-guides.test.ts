import { describe, expect, it } from "vitest";
import { practiceGuides } from "./practice-guides";

describe("city practice guide links", () => {
  it.each(["car-accidents", "truck-accidents", "motorcycle-accidents"])(
    "%s has three distinct published guide destinations",
    (practice) => {
      const guides = practiceGuides(practice);
      expect(guides).toHaveLength(3);
      expect(guides[0].path).toBe(`/practice-areas/${practice}`);
      expect(new Set(guides.map((guide) => guide.path)).size).toBe(3);
      for (const guide of guides) {
        expect(guide.label).toBeTruthy();
        expect(guide.path).toMatch(/^\//);
        expect(guide.group === "resource" || guide.practiceArea === practice).toBe(true);
      }
    },
  );

  it("does not add irrelevant links to other practices", () => {
    expect(practiceGuides("dog-bites")).toEqual([]);
    expect(practiceGuides("")).toEqual([]);
  });
});
