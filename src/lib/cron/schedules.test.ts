import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CRON_JOBS, jobForSchedule } from "./schedules";

describe("cron schedule registry", () => {
  it("matches vercel.json exactly, so the two never drift", () => {
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      crons: Array<{ path: string; schedule: string }>;
    };
    const fromRegistry = CRON_JOBS.map(({ path, schedule }) => ({ path, schedule }));
    expect(vercel.crons).toEqual(fromRegistry);
  });

  it("uses distinct five-field UTC expressions", () => {
    const seen = new Set<string>();
    for (const job of CRON_JOBS) {
      expect(job.schedule.trim().split(/\s+/)).toHaveLength(5);
      expect(seen.has(job.schedule)).toBe(false);
      seen.add(job.schedule);
    }
  });

  it("maps a fired expression back to its route", () => {
    expect(jobForSchedule("0 * * * *")?.path).toBe("/api/cron/publish-scheduled");
    expect(jobForSchedule("1 2 3 4 5")).toBeUndefined();
  });
});
