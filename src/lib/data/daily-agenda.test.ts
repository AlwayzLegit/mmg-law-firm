import { describe, expect, it } from "vitest";

import { shapeDeadlines, shapeWaiting } from "./daily-agenda";

const now = Date.parse("2026-10-24T15:00:00Z");

describe("shapeWaiting", () => {
  it("orders oldest first, grades by SLA tone and keeps first names only", () => {
    const rows = shapeWaiting(
      [
        {
          id: "a",
          full_name: "Ana Petrosyan",
          created_at: "2026-10-24T14:50:00Z",
          assigned_to: null,
        },
        {
          id: "b",
          full_name: "Ben Ohanian",
          created_at: "2026-10-17T09:00:00Z",
          assigned_to: "user-1",
        },
        {
          id: "c",
          full_name: "  ",
          created_at: "2026-10-24T14:20:00Z",
          assigned_to: null,
        },
      ],
      now,
    );
    expect(rows.map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(rows[0]).toMatchObject({
      firstName: "Ben",
      tone: "breach",
      assigned: true,
    });
    expect(rows[1]).toMatchObject({ firstName: "Lead", minutes: 40, tone: "warn" });
    expect(rows[2]).toMatchObject({ firstName: "Ana", minutes: 10, tone: "ok" });
  });
});

describe("shapeDeadlines", () => {
  it("keeps deadlines inside the window, soonest first, honouring the public-entity flag", () => {
    const rows = shapeDeadlines(
      [
        {
          id: "far",
          full_name: "Far Away",
          incident_date: "2026-06-15",
          intake: {},
          practice_areas: { slug: "car-accidents" },
        },
        {
          id: "gov",
          full_name: "City Bus",
          incident_date: "2026-06-15",
          intake: { government_entity: true },
          practice_areas: [{ slug: "car-accidents" }],
        },
        {
          id: "old",
          full_name: "Passed Claim",
          incident_date: "2024-01-01",
          intake: null,
          practice_areas: null,
        },
        {
          id: "none",
          full_name: "No Date",
          incident_date: null,
          intake: null,
          practice_areas: null,
        },
      ],
      now,
    );
    expect(rows.map((r) => r.id)).toEqual(["old", "gov"]);
    expect(rows[1]).toMatchObject({
      firstName: "City",
      date: "2026-12-15",
      tone: "urgent",
      ruleLabel: "Government claim (public entity defendant)",
    });
    expect(rows[0].tone).toBe("passed");
  });
});
