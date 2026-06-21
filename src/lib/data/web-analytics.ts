import "server-only";

import { env } from "@/lib/env";

export type RankedPage = { label: string; count: number };
export type DailyPoint = { date: string; count: number };

export type WebAnalytics = {
  /** False when the PostHog query env vars aren't set. */
  configured: boolean;
  /** True once at least one pageview has been recorded in the window. */
  hasData: boolean;
  visitors7: number;
  pageviews7: number;
  visitors30: number;
  pageviews30: number;
  daily: DailyPoint[];
  topPages: RankedPage[];
  topReferrers: RankedPage[];
};

const EMPTY: Omit<WebAnalytics, "configured"> = {
  hasData: false,
  visitors7: 0,
  pageviews7: 0,
  visitors30: 0,
  pageviews30: 0,
  daily: [],
  topPages: [],
  topReferrers: [],
};

/**
 * Turn the PostHog ingestion host into the app/query host. Events are sent to
 * `us.i.posthog.com`, but the query API lives on `us.posthog.com` — i.e. the
 * `i.` ingestion subdomain is dropped. Falls back to the US app host.
 */
export function deriveQueryHost(ingestHost: string | undefined): string {
  const host = (ingestHost ?? "").trim();
  if (!host) return "https://us.posthog.com";
  return host
    .replace("://us.i.posthog.com", "://us.posthog.com")
    .replace("://eu.i.posthog.com", "://eu.posthog.com");
}

/** Coerce a PostHog HogQL row (array of unknowns) into a {label,count} pair. */
export function toRanked(row: unknown[]): RankedPage {
  const label = typeof row[0] === "string" && row[0] ? row[0] : "(unknown)";
  const count = Number(row[1] ?? 0);
  return { label, count: Number.isFinite(count) ? count : 0 };
}

async function hogql(
  host: string,
  projectId: string,
  apiKey: string,
  query: string,
): Promise<unknown[][]> {
  const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    // Cache for 5 minutes so repeated dashboard loads don't re-hit PostHog.
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`PostHog query failed: ${res.status}`);
  }
  const json = (await res.json()) as { results?: unknown[][] };
  return json.results ?? [];
}

/**
 * Website traffic for the admin dashboard, read from PostHog $pageview events.
 * Returns a configured=false sentinel when the query env vars are missing, and
 * degrades to zeros (never throws) on any query error so the dashboard is
 * resilient.
 */
export async function getWebAnalytics(): Promise<WebAnalytics> {
  const apiKey = env.POSTHOG_PERSONAL_API_KEY;
  const projectId = env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) {
    return { configured: false, ...EMPTY };
  }

  const host = deriveQueryHost(env.NEXT_PUBLIC_POSTHOG_HOST);

  try {
    const [kpiRows, dailyRows, pageRows, refRows] = await Promise.all([
      hogql(
        host,
        projectId,
        apiKey,
        `SELECT
           countIf(timestamp > now() - INTERVAL 7 DAY) AS pv7,
           count() AS pv30,
           uniqIf(person_id, timestamp > now() - INTERVAL 7 DAY) AS v7,
           uniq(person_id) AS v30
         FROM events
         WHERE event = '$pageview' AND timestamp > now() - INTERVAL 30 DAY`,
      ),
      hogql(
        host,
        projectId,
        apiKey,
        `SELECT toDate(timestamp) AS d, count() AS c
         FROM events
         WHERE event = '$pageview' AND timestamp > now() - INTERVAL 14 DAY
         GROUP BY d ORDER BY d ASC`,
      ),
      hogql(
        host,
        projectId,
        apiKey,
        `SELECT coalesce(nullIf(properties.$pathname, ''), properties.$current_url) AS path,
                count() AS c
         FROM events
         WHERE event = '$pageview' AND timestamp > now() - INTERVAL 30 DAY
         GROUP BY path ORDER BY c DESC LIMIT 8`,
      ),
      hogql(
        host,
        projectId,
        apiKey,
        `SELECT nullIf(properties.$referring_domain, '') AS ref, count() AS c
         FROM events
         WHERE event = '$pageview' AND timestamp > now() - INTERVAL 30 DAY
           AND properties.$referring_domain != '$direct'
         GROUP BY ref ORDER BY c DESC LIMIT 8`,
      ),
    ]);

    const kpi = kpiRows[0] ?? [];
    const pageviews7 = Number(kpi[0] ?? 0);
    const pageviews30 = Number(kpi[1] ?? 0);
    const visitors7 = Number(kpi[2] ?? 0);
    const visitors30 = Number(kpi[3] ?? 0);

    const daily: DailyPoint[] = dailyRows.map((r) => ({
      date: String(r[0] ?? ""),
      count: Number(r[1] ?? 0),
    }));

    return {
      configured: true,
      hasData: pageviews30 > 0,
      visitors7,
      pageviews7,
      visitors30,
      pageviews30,
      daily,
      topPages: pageRows.map(toRanked),
      topReferrers: refRows.map(toRanked),
    };
  } catch (err) {
    console.warn("[web-analytics] query failed:", err);
    return { configured: true, ...EMPTY };
  }
}
