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

  it("matches the Cloudflare cron triggers in wrangler.jsonc", () => {
    // wrangler.jsonc allows comments; strip them before parsing.
    const raw = readFileSync("wrangler.jsonc", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const wrangler = JSON.parse(raw) as { triggers?: { crons?: string[] } };
    expect(wrangler.triggers?.crons).toEqual(CRON_JOBS.map((j) => j.schedule));
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
