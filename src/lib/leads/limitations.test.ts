import { describe, expect, it } from "vitest";

import {
  FEHA_EMPLOYMENT,
  GOVERNMENT_CLAIM,
  PERSONAL_INJURY,
  WAGE_CLAIM,
  addMonths,
  deadlineFor,
  describeDaysLeft,
  ruleForPracticeArea,
} from "./limitations";

describe("ruleForPracticeArea", () => {
  it("defaults to personal injury and routes employment and wage claims", () => {
    expect(ruleForPracticeArea("car-accidents")).toBe(PERSONAL_INJURY);
    expect(ruleForPracticeArea(null)).toBe(PERSONAL_INJURY);
    expect(ruleForPracticeArea("wrongful-termination")).toBe(FEHA_EMPLOYMENT);
    expect(ruleForPracticeArea("wage-and-hour")).toBe(WAGE_CLAIM);
  });

  it("a public-entity defendant overrides everything with the 6-month claim", () => {
    expect(ruleForPracticeArea("car-accidents", { governmentEntity: true })).toBe(GOVERNMENT_CLAIM);
    expect(ruleForPracticeArea("wrongful-termination", { governmentEntity: true })).toBe(GOVERNMENT_CLAIM);
  });
});

describe("addMonths", () => {
  it("adds calendar months and clamps to month end", () => {
    expect(addMonths("2026-06-15", 24)).toBe("2028-06-15");
    expect(addMonths("2026-08-31", 6)).toBe("2027-02-28");
    expect(addMonths("2024-02-29", 24)).toBe("2026-02-28");
  });
});

describe("deadlineFor", () => {
  const now = Date.parse("2026-10-24T12:00:00Z");

  it("computes the date, days left and a tone", () => {
    const d = deadlineFor("2026-06-15", PERSONAL_INJURY, now)!;
    expect(d.date).toBe("2028-06-15");
    expect(d.daysLeft).toBe(599);
    expect(d.tone).toBe("ok");

    const g = deadlineFor("2026-06-15", GOVERNMENT_CLAIM, now)!;
    expect(g.date).toBe("2026-12-15");
    expect(g.daysLeft).toBe(51);
    expect(g.tone).toBe("urgent");

    expect(deadlineFor("2024-01-01", PERSONAL_INJURY, now)!.tone).toBe("passed");
    expect(deadlineFor("2026-06-01", PERSONAL_INJURY, Date.parse("2028-01-01T00:00:00Z"))!.tone).toBe("warn");
  });

  it("returns null without a usable incident date", () => {
    expect(deadlineFor(null, PERSONAL_INJURY, now)).toBeNull();
    expect(deadlineFor("June 2026", PERSONAL_INJURY, now)).toBeNull();
  });
});

describe("describeDaysLeft", () => {
  it("reads naturally", () => {
    expect(describeDaysLeft(0)).toBe("today");
    expect(describeDaysLeft(1)).toBe("in 1 day");
    expect(describeDaysLeft(45)).toBe("in 45 days");
    expect(describeDaysLeft(599)).toBe("in about 20 months");
    expect(describeDaysLeft(-1)).toBe("passed yesterday");
    expect(describeDaysLeft(-12)).toBe("passed 12 days ago");
  });
});
