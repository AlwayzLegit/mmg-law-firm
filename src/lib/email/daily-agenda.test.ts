import { describe, expect, it } from "vitest";

import type { DailyAgenda } from "@/lib/data/daily-agenda";

import { agendaSubject, renderDailyAgendaEmail } from "./daily-agenda";

const empty: DailyAgenda = {
  waiting: [],
  breaches: 0,
  overdueTasks: [],
  todayTasks: [],
  followUps: [],
  deadlines: [],
  empty: true,
};

const busy: DailyAgenda = {
  ...empty,
  empty: false,
  waiting: [
    {
      id: "lead-1",
      firstName: "Ben",
      at: "2026-10-17T09:00:00Z",
      minutes: 7 * 24 * 60 + 90,
      tone: "breach",
      assigned: false,
    },
  ],
  breaches: 1,
  overdueTasks: [{ title: "Call insurer", dueAt: "2026-10-20T17:00:00Z", leadId: null }],
  deadlines: [
    {
      id: "lead-2",
      firstName: "Ana",
      date: "2026-12-15",
      daysLeft: 52,
      tone: "urgent",
      ruleLabel: "Government claim (public entity defendant)",
    },
  ],
};

describe("agendaSubject", () => {
  it("leads with the waiting queue and says 'clear' when empty", () => {
    expect(agendaSubject(busy)).toMatch(
      /today: 1 waiting for first call \(1 over 1h\), 1 overdue, 1 deadlines$/,
    );
    expect(agendaSubject(empty)).toMatch(/today: clear$/);
  });
});

describe("renderDailyAgendaEmail", () => {
  it("links each lead by id, shows ages and deadlines, and never leaks more than a first name", () => {
    const { html } = renderDailyAgendaEmail(busy, Date.parse("2026-10-24T15:00:00Z"));
    expect(html).toContain("/admin/leads/lead-1");
    expect(html).toContain("waiting 7d 1h");
    expect(html).toContain("unassigned");
    expect(html).toContain("Call insurer");
    expect(html).toContain("Dec 15, 2026");
    expect(html).toContain("in 52 days");
    expect(html).not.toContain("Petrosyan");
    expect(html).not.toContain("@");
  });

  it("renders the clear-day message when nothing is pending", () => {
    const { html } = renderDailyAgendaEmail(empty);
    expect(html).toContain("Have a clear day");
    expect(html).not.toContain("Needs first response");
  });
});
