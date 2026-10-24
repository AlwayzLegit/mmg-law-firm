import { describe, expect, it } from "vitest";

import { ageMinutes, formatAge, slaTone } from "./sla";

describe("speed-to-lead SLA helpers", () => {
  it("measures age in whole minutes and never negative", () => {
    const now = Date.parse("2026-10-23T12:00:00Z");
    expect(ageMinutes("2026-10-23T11:46:30Z", now)).toBe(13);
    expect(ageMinutes("2026-10-23T12:05:00Z", now)).toBe(0);
  });

  it("grades against the 15 minute target and 1 hour warning", () => {
    expect(slaTone(0)).toBe("ok");
    expect(slaTone(14)).toBe("ok");
    expect(slaTone(15)).toBe("warn");
    expect(slaTone(59)).toBe("warn");
    expect(slaTone(60)).toBe("breach");
  });

  it("formats ages compactly", () => {
    expect(formatAge(4)).toBe("4m");
    expect(formatAge(60)).toBe("1h");
    expect(formatAge(192)).toBe("3h 12m");
    expect(formatAge(24 * 60 + 5 * 60)).toBe("1d 5h");
    expect(formatAge(48 * 60)).toBe("2d");
  });
});
