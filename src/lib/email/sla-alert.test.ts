import { describe, expect, it } from "vitest";

import type { WaitingLead } from "@/lib/data/daily-agenda";

import { renderSlaAlert } from "./sla-alert";

const lead = (id: string, firstName: string, minutes: number, assigned = false): WaitingLead => ({
  id,
  firstName,
  at: "2026-10-24T14:00:00Z",
  minutes,
  tone: minutes >= 60 ? "breach" : "warn",
  assigned,
});

describe("renderSlaAlert", () => {
  it("names the oldest wait in the subject and links each lead", () => {
    const { subject, html, sms } = renderSlaAlert([
      lead("a", "Ana", 95),
      lead("b", "Ben", 17, true),
    ]);
    expect(subject).toBe("⏱ 2 leads waiting for a first call — oldest 1h 35m");
    expect(html).toContain("/admin/leads/a");
    expect(html).toContain("/admin/leads/b");
    expect(html).toContain("waiting 1h 35m");
    expect(html.match(/unassigned/g)).toHaveLength(1);
    expect(sms).toMatch(
      /^MMG Law Firm: 2 leads waiting for a first call — Ana \(1h 35m\), Ben \(17m\)\. \S+\/admin\/today$/,
    );
  });

  it("truncates the SMS to three names and uses singular wording", () => {
    const five = ["A", "B", "C", "D", "E"].map((n, i) => lead(String(i), n, 20 + i));
    expect(renderSlaAlert(five).sms).toContain("+2 more");
    expect(renderSlaAlert([lead("x", "Solo", 16)]).subject).toMatch(/^⏱ 1 lead waiting/);
    expect(renderSlaAlert([lead("x", "Solo", 16)]).html).toContain("1 lead has been waiting");
  });
});
