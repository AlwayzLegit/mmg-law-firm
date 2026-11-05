import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CRON_JOBS, jobForSchedule } from "./schedules";

describe("cron schedule registry", () => {
  it("leaves vercel.json without crons, so only Cloudflare schedules jobs", () => {
    // Since the cutover the production Worker is the one scheduler. Vercel
    // Cron calls its own deployment directly, so leaving entries here would
    // run every job twice against the same database.
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons?: unknown[] };
    expect(vercel.crons ?? []).toEqual([]);
  });

  it("matches the Cloudflare cron triggers in wrangler.jsonc", () => {
    // wrangler.jsonc allows comments; strip them before parsing.
    const raw = readFileSync("wrangler.jsonc", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const wrangler = JSON.parse(raw) as {
      triggers?: { crons?: string[] };
      env?: Record<string, { triggers?: { crons?: string[] } }>;
    };
    expect(wrangler.triggers?.crons).toEqual(CRON_JOBS.map((j) => j.schedule));
    // Staging shares the production database: it must never schedule jobs.
    expect(wrangler.env?.staging?.triggers?.crons).toEqual([]);
  });

  it("keeps the production hostnames on the production front Worker only", () => {
    type Config = {
      services?: Array<{ binding: string; service: string }>;
      routes?: Array<{ pattern: string }>;
      env?: Record<string, Omit<Config, "env">>;
    };
    const read = (file: string) =>
      JSON.parse(
        readFileSync(file, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, ""),
      ) as Config;
    const app = read("wrangler.jsonc");
    const front = read("wrangler.front.jsonc");
    // The front Worker owns the hostnames; the app Worker answers only on
    // workers.dev and through the front Worker's service binding.
    expect(app.routes ?? []).toEqual([]);
    expect(app.env?.staging?.routes).toEqual([]);
    expect(front.routes?.map((r) => r.pattern)).toEqual(["www.mmg-lawfirm.com", "mmg-lawfirm.com"]);
    // Routes are inherited into envs, so staging has to declare its own.
    expect(front.env?.staging?.routes?.map((r) => r.pattern)).toEqual(["staging.mmg-lawfirm.com"]);
    // And each front Worker must call its own app: staging shares the database, not the hosts.
    expect(front.services).toEqual([{ binding: "APP", service: "mmg-law-firm" }]);
    expect(front.env?.staging?.services).toEqual([{ binding: "APP", service: "mmg-law-firm-staging" }]);
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
