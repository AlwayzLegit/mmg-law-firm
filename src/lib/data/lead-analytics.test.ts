import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  formatMinutes,
  getLeadAnalytics,
  getResponseTimeStats,
} from "./lead-analytics";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-06-21T12:00:00.000Z").getTime();

/**
 * Minimal chainable Supabase stub. Every query-builder method returns the
 * same thenable, which resolves to the canned rows for the table named in
 * `.from()`. Filters are intentionally ignored — these tests exercise the
 * aggregation math, not PostgREST.
 */
function fakeSupabase(data: Record<string, unknown[]>): SupabaseClient {
  return {
    from(table: string) {
      const result = { data: data[table] ?? [], error: null };
      const builder: Record<string, unknown> = new Proxy(
        {},
        {
          get(_t, prop) {
            if (prop === "then") {
              return (resolve: (v: typeof result) => void) => resolve(result);
            }
            return () => builder;
          },
        },
      );
      return builder;
    },
  } as unknown as SupabaseClient;
}

function iso(offsetMs: number): string {
  return new Date(NOW + offsetMs).toISOString();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getLeadAnalytics", () => {
  it("computes totals, conversion, and week-over-week from rows", async () => {
    const leads = [
      // last 7 days
      { status: "signed", created_at: iso(-1 * DAY_MS), utm_source: "google" },
      { status: "signed", created_at: iso(-2 * DAY_MS), utm_source: "google" },
      { status: "contacted", created_at: iso(-3 * DAY_MS), utm_source: null },
      // previous 7 days
      { status: "new", created_at: iso(-9 * DAY_MS), utm_source: "bing" },
      // spam (recent) — excluded from "real" totals and W/W
      { status: "spam", created_at: iso(-1 * DAY_MS), utm_source: null },
    ];
    const supabase = fakeSupabase({ leads });

    const a = await getLeadAnalytics(supabase, 30);

    expect(a.total).toBe(5);
    expect(a.spam).toBe(1);
    expect(a.qualifiedTotal).toBe(4);
    expect(a.signed).toBe(2);
    expect(a.conversionPct).toBe(50); // 2 signed / 4 real
    expect(a.byStatus.new).toBe(1);
    expect(a.byStatus.contacted).toBe(1);
    expect(a.byStatus.signed).toBe(2);
    expect(a.byStatus.spam).toBe(1);
    expect(a.last7).toBe(3); // non-spam in last 7d
    expect(a.prev7).toBe(1);
    expect(a.weekOverWeekPct).toBe(200); // (3 - 1) / 1
  });

  it("returns zeroed metrics and null W/W with no leads", async () => {
    const a = await getLeadAnalytics(fakeSupabase({ leads: [] }), 30);
    expect(a.total).toBe(0);
    expect(a.conversionPct).toBe(0);
    expect(a.weekOverWeekPct).toBeNull();
    expect(a.daily).toHaveLength(30); // dense series, zeros filled
  });

  it("ranks lead sources, mapping null utm to direct", async () => {
    const leads = [
      { status: "new", created_at: iso(-1 * DAY_MS), utm_source: "google" },
      { status: "new", created_at: iso(-1 * DAY_MS), utm_source: "google" },
      { status: "new", created_at: iso(-1 * DAY_MS), utm_source: null },
    ];
    const a = await getLeadAnalytics(fakeSupabase({ leads }), 30);
    expect(a.bySource[0]).toMatchObject({ label: "google", count: 2 });
    expect(a.bySource.some((r) => r.label === "(direct / none)")).toBe(true);
  });
});

describe("getResponseTimeStats", () => {
  it("computes median and within-SLA percentages from first touch", async () => {
    const leads = [
      { id: "a", created_at: iso(-2 * DAY_MS), status: "contacted" },
      { id: "b", created_at: iso(-2 * DAY_MS), status: "contacted" },
      { id: "c", created_at: iso(-1 * DAY_MS), status: "new" }, // open, untouched
    ];
    const audit_log = [
      { entity_id: "a", ts: iso(-2 * DAY_MS + 30 * 60000) }, // 30 min
      { entity_id: "b", ts: iso(-2 * DAY_MS + 90 * 60000) }, // 90 min
    ];
    const stats = await getResponseTimeStats(
      fakeSupabase({ leads, audit_log }),
      30,
    );

    expect(stats.sample).toBe(2);
    expect(stats.medianMinutes).toBe(60); // (30 + 90) / 2
    expect(stats.within1hPct).toBe(50); // only the 30-min lead
    expect(stats.within24hPct).toBe(100);
    expect(stats.pending).toBe(1); // lead c
  });

  it("reports nulls when there are no leads", async () => {
    const stats = await getResponseTimeStats(fakeSupabase({ leads: [] }), 30);
    expect(stats.sample).toBe(0);
    expect(stats.medianMinutes).toBeNull();
    expect(stats.pending).toBe(0);
  });

  it("counts untouched open leads as pending, not closed ones", async () => {
    const leads = [
      { id: "a", created_at: iso(-1 * DAY_MS), status: "new" }, // pending
      { id: "b", created_at: iso(-1 * DAY_MS), status: "rejected" }, // closed
      { id: "c", created_at: iso(-1 * DAY_MS), status: "signed" }, // closed
    ];
    const stats = await getResponseTimeStats(fakeSupabase({ leads }), 30);
    expect(stats.pending).toBe(1);
  });
});

describe("formatMinutes", () => {
  it("renders sub-hour values in minutes", () => {
    expect(formatMinutes(45)).toBe("45m");
  });
  it("renders sub-day values in hours", () => {
    expect(formatMinutes(90)).toBe("1.5h");
  });
  it("renders day-plus values in days", () => {
    expect(formatMinutes(2880)).toBe("2.0d");
  });
});

describe("getConversionBreakdowns", () => {
  it("ranks channels by signed and reports median days to sign from the audit log", async () => {
    const leads = [
      { id: "a", status: "signed", created_at: iso(-30 * DAY_MS), utm_source: "google", utm_medium: "cpc", gclid: null, referrer: null, practice_areas: null, counties: null },
      { id: "b", status: "signed", created_at: iso(-20 * DAY_MS), utm_source: "google", utm_medium: "cpc", gclid: null, referrer: null, practice_areas: null, counties: null },
      { id: "c", status: "contacted", created_at: iso(-5 * DAY_MS), utm_source: "google", utm_medium: "cpc", gclid: null, referrer: null, practice_areas: null, counties: null },
      { id: "d", status: "signed", created_at: iso(-10 * DAY_MS), utm_source: null, utm_medium: null, gclid: null, referrer: null, practice_areas: null, counties: null },
      { id: "e", status: "spam", created_at: iso(-1 * DAY_MS), utm_source: null, utm_medium: null, gclid: null, referrer: null, practice_areas: null, counties: null },
    ];
    const audit_log = [
      { entity_id: "a", created_at: iso(-26 * DAY_MS), diff: { to: "signed" } }, // 4 days
      { entity_id: "a", created_at: iso(-25 * DAY_MS), diff: { to: "signed" } }, // later duplicate ignored
      { entity_id: "b", created_at: iso(-10 * DAY_MS), diff: { to: "signed" } }, // 10 days
      { entity_id: "c", created_at: iso(-4 * DAY_MS), diff: { to: "contacted" } },
      // "d" signed with no audit entry → excluded from the median, still counted as signed
    ];
    const { getConversionBreakdowns, medianDays } = await import("./lead-analytics");
    const r = await getConversionBreakdowns(fakeSupabase({ leads, audit_log }), 90);
    expect(r.byChannel.map((x) => [x.label, x.leads, x.signed, x.signedPct, x.medianDaysToSign])).toEqual([
      ["Google Ads", 3, 2, 67, 7],
      ["Direct", 1, 1, 100, null],
    ]);
    expect(medianDays([])).toBeNull();
    expect(medianDays([1, 2, 10])).toBe(2);
    expect(medianDays([1.26, 3])).toBe(2.1);
  });
});
