/**
 * The one list of scheduled jobs, run by Cloudflare: the `wrangler` cron
 * triggers (a test asserts they match) + the Worker `scheduled()` handler,
 * which maps a fired cron expression back to the route to call. vercel.json
 * `crons` has been empty since the cutover (2026-10-25); to roll back to
 * Vercel, restore its entries from git history.
 *
 * Expressions are UTC on both platforms. 14:00 UTC = 7 am Pacific (PDT) /
 * 6 am (PST).
 */
export type CronJob = {
  /** Route under /api/cron. */
  path: `/api/cron/${string}`;
  /** Five-field cron expression, UTC. */
  schedule: string;
  description: string;
};

export const CRON_JOBS: readonly CronJob[] = [
  {
    path: "/api/cron/weekly-digest",
    schedule: "0 14 * * 1",
    description: "Monday 14:00 UTC: 30-day lead digest to LEAD_NOTIFY_EMAIL.",
  },
  {
    path: "/api/cron/daily-agenda",
    schedule: "0 15 * * 1-5",
    description:
      "Weekdays 15:00 UTC: leads waiting for a first call, overdue tasks, due follow-ups, near statute deadlines.",
  },
  {
    path: "/api/cron/sla-alerts",
    schedule: "*/15 * * * *",
    description:
      "Every 15 minutes: one-time email + SMS for leads past the first-response target.",
  },
  {
    path: "/api/cron/publish-scheduled",
    schedule: "0 * * * *",
    description: "Hourly: revalidate blog posts whose published_at came due.",
  },
];

/** Route for a fired cron expression (Cloudflare passes `event.cron`). */
export function jobForSchedule(schedule: string): CronJob | undefined {
  return CRON_JOBS.find((j) => j.schedule === schedule);
}
