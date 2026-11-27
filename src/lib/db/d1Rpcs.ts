import type { D1Like } from "./d1Client";
import { decodeRow, QueryError } from "./d1Sql";

// MMG Law's Postgres functions for D1 (OPS-364, part 2a of OPS-353).
//
// Each entry is registered in RPCS (d1Client.ts) by the function's name and
// takes the same argument names as the PostgREST call, so the callers that
// use `supabase.rpc(name, args)` run unchanged when DATA_PROVIDER=d1. Default
// stays supabase.
//
// Source of each port (supabase/migrations, the last definition wins):
//   bump_rate_limit                  0012_rate_limits.sql
//   claim_content_topics             0031_content_agent.sql (row-locking claim)
//   content_health_issues_unguarded  0031_content_agent.sql
//   content_health_issues            0033_private_auth_helpers.sql (guarded copy)
//   bump_error_count                 0040_error_counts.sql
//   error_counts_recent              0040_error_counts.sql
//
// The updated_at and blog review_status triggers are not here: migrations/d1/
// 0001_schema.sql already creates them (trg_*_touch, trg_blog_posts_sync_review_*).
//
// Concurrency: D1 runs one statement at a time per database, so each write is
// ONE statement (an upsert, or an UPDATE guarded by the status it expects).
// That takes the place of Postgres' row locks.
//
// Not here, on purpose: is_admin, is_owner, is_editor (policy helpers, OPS-404).

type Row = Record<string, unknown>;
export type RpcImpl = (db: D1Like, args: Record<string, unknown>) => Promise<unknown>;

const NOW_ISO = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

function invalid(message: string): QueryError {
  return new QueryError(message, "22023");
}

function wholeNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw invalid(`invalid input for parameter ${name}`);
  return Math.trunc(value);
}

// bump_rate_limit(p_key text, p_window_seconds int) → [{ count, window_started_at }]
// Insert a fresh row (count 1); inside the window add one; after the window
// reset to count 1 and a new start. One upsert, so two callers cannot both
// read the old count.
const bumpRateLimit: RpcImpl = async (db, args) => {
  const key = args.p_key;
  if (typeof key !== "string" || key.length === 0) throw invalid("invalid input for parameter p_key");
  const windowSeconds = wholeNumber(args.p_window_seconds, "p_window_seconds");
  const expired = `(julianday(excluded.window_started_at) - julianday(rate_limits.window_started_at)) * 86400.0 > ?`;
  const { results } = await db
    .prepare(
      `INSERT INTO rate_limits (key, count, window_started_at, updated_at)
       VALUES (?, 1, ${NOW_ISO}, ${NOW_ISO})
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN ${expired} THEN 1 ELSE rate_limits.count + 1 END,
         window_started_at = CASE WHEN ${expired} THEN excluded.window_started_at ELSE rate_limits.window_started_at END,
         updated_at = excluded.updated_at
       RETURNING count, window_started_at`,
    )
    .bind(key, windowSeconds, windowSeconds)
    .all<Row>();
  return results;
};

// claim_content_topics(p_run_id uuid, p_limit int, p_topic_ids uuid[] default null)
// → the claimed content_topics rows. Queued topics only, lowest priority number
// first then oldest, at most p_limit (below 0 or null counts as 0), narrowed to
// p_topic_ids when given. A single UPDATE that still checks status = 'queued',
// so the same topic can never be handed to two runs.
const claimContentTopics: RpcImpl = async (db, args) => {
  const runId = args.p_run_id;
  if (typeof runId !== "string" || runId.length === 0) throw invalid("invalid input for parameter p_run_id");
  const limit = args.p_limit == null ? 0 : Math.max(wholeNumber(args.p_limit, "p_limit"), 0);
  const ids = args.p_topic_ids;
  if (ids != null && (!Array.isArray(ids) || ids.some((i) => typeof i !== "string"))) {
    throw invalid("invalid input for parameter p_topic_ids");
  }
  const idsJson = ids == null ? null : JSON.stringify(ids);
  if (limit === 0) return [];
  const { results } = await db
    .prepare(
      `UPDATE content_topics
          SET status = 'claimed', claimed_by_run_id = ?, claimed_at = ${NOW_ISO}
        WHERE status = 'queued'
          AND id IN (
            SELECT id FROM content_topics
             WHERE status = 'queued'
               AND (? IS NULL OR id IN (SELECT value FROM json_each(?)))
             ORDER BY priority ASC, created_at ASC
             LIMIT ?
          )
        RETURNING *`,
    )
    .bind(runId, idsJson, idsJson, limit)
    .all<Row>();
  // RETURNING has no order; hand the rows back in claim order.
  return results
    .map((r) => decodeRow("content_topics", r))
    .sort((a, b) => Number(a.priority) - Number(b.priority) || String(a.created_at).localeCompare(String(b.created_at)));
};

// content_health_issues_unguarded() → [{ entity, entity_id, label, issue, severity }]
// Same checks, in the same order, as 0031_content_agent.sql. Postgres' length()
// counts characters, and so does SQLite's on text.
const LOCATION_LABEL = `coalesce(c.name, '?') || ' · ' || coalesce(pa.name, '?')`;
const LOCATION_FROM = `FROM location_pages lp
    LEFT JOIN cities c ON c.id = lp.city_id
    LEFT JOIN practice_areas pa ON pa.id = lp.practice_area_id`;
const YEAR_AGO = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-365 days')`;

const CONTENT_HEALTH_SQL = `
  SELECT 'location_page' AS entity, lp.id AS entity_id, ${LOCATION_LABEL} AS label, 'Missing meta description' AS issue, 'high' AS severity
    ${LOCATION_FROM}
   WHERE lp.is_published = 1 AND (lp.meta_description IS NULL OR length(lp.meta_description) = 0)
  UNION ALL
  SELECT 'location_page', lp.id, ${LOCATION_LABEL}, 'Meta too long (' || length(lp.meta_description) || ' chars)', 'medium'
    ${LOCATION_FROM}
   WHERE lp.is_published = 1 AND length(lp.meta_description) > 160
  UNION ALL
  SELECT 'location_page', lp.id, ${LOCATION_LABEL}, 'Thin local angle (' || coalesce(length(lp.local_angle_md), 0) || ' chars)', 'medium'
    ${LOCATION_FROM}
   WHERE lp.is_published = 1 AND coalesce(length(lp.local_angle_md), 0) < 200
  UNION ALL
  SELECT 'location_page', lp.id, ${LOCATION_LABEL}, 'Overdue for review', 'low'
    ${LOCATION_FROM}
   WHERE lp.is_published = 1
     AND (lp.last_reviewed_at < ${YEAR_AGO} OR (lp.last_reviewed_at IS NULL AND lp.created_at < ${YEAR_AGO}))
  UNION ALL
  SELECT 'location_page', lp.id, ${LOCATION_LABEL}, 'Draft — needs local angle to publish', 'low'
    ${LOCATION_FROM}
   WHERE lp.is_published = 0 AND lp.local_angle_md IS NULL
  UNION ALL
  SELECT 'county', c.id, c.name, 'Missing meta description', 'high'
    FROM counties c
   WHERE c.is_published = 1 AND (c.meta_description IS NULL OR length(c.meta_description) = 0)
  UNION ALL
  SELECT 'county', c.id, c.name, 'Meta too long (' || length(c.meta_description) || ' chars)', 'medium'
    FROM counties c
   WHERE c.is_published = 1 AND length(c.meta_description) > 160
  UNION ALL
  SELECT 'county', c.id, c.name, 'Thin intro (' || coalesce(length(c.intro_md), 0) || ' chars)', 'low'
    FROM counties c
   WHERE c.is_published = 1 AND coalesce(length(c.intro_md), 0) < 200
  UNION ALL
  SELECT 'practice_area', pa.id, pa.name, 'Missing meta description', 'high'
    FROM practice_areas pa
   WHERE pa.is_published = 1 AND (pa.meta_description IS NULL OR length(pa.meta_description) = 0)
  UNION ALL
  SELECT 'practice_area', pa.id, pa.name, 'Meta too long (' || length(pa.meta_description) || ' chars)', 'medium'
    FROM practice_areas pa
   WHERE pa.is_published = 1 AND length(pa.meta_description) > 160
  UNION ALL
  SELECT 'blog', b.id, b.title, 'Missing meta description', 'high'
    FROM blog_posts b
   WHERE b.is_published = 1 AND (b.meta_description IS NULL OR length(b.meta_description) = 0)
  UNION ALL
  SELECT 'blog', b.id, b.title, 'Meta too long (' || length(b.meta_description) || ' chars)', 'medium'
    FROM blog_posts b
   WHERE b.is_published = 1 AND length(b.meta_description) > 160
  UNION ALL
  SELECT 'blog', b.id, b.title, 'Thin body (' || coalesce(length(b.body_md), 0) || ' chars)', 'low'
    FROM blog_posts b
   WHERE b.is_published = 1 AND coalesce(length(b.body_md), 0) < 500`;

const contentHealthIssuesUnguarded: RpcImpl = async (db) => {
  const { results } = await db.prepare(CONTENT_HEALTH_SQL).all<Row>();
  return results;
};

// content_health_issues() is the same list behind is_admin() in Postgres. In D1
// mode the check belongs to the caller (src/lib/data/content-health.ts runs
// after the admin gate) until the policy map of OPS-404 exists, which owns the
// guard. So until then this reads exactly what the unguarded one reads.
const contentHealthIssues: RpcImpl = contentHealthIssuesUnguarded;

// bump_error_count(p_env text, p_route text) → void (null)
// Ignores any environment but production or staging and any route group that
// is not "/word" or "/word/word" of lowercase letters, digits and hyphens (at
// most 60 characters). Adds one to this environment, route and hour, and drops
// rows older than 30 days. Both statements go in one batch (one transaction).
const ERROR_ROUTE = /^\/[a-z0-9-]+(\/[a-z0-9-]+)?$/;

const bumpErrorCount: RpcImpl = async (db, args) => {
  const env = args.p_env;
  const route = args.p_route;
  if (typeof env !== "string" || (env !== "production" && env !== "staging")) return null;
  if (typeof route !== "string" || route.length > 60 || !ERROR_ROUTE.test(route)) return null;
  await db.batch([
    db
      .prepare(
        `INSERT INTO error_counts (env, route, hour, count)
         VALUES (?, ?, strftime('%Y-%m-%dT%H:00:00.000Z', 'now'), 1)
         ON CONFLICT (env, route, hour) DO UPDATE SET count = error_counts.count + 1`,
      )
      .bind(env, route),
    db.prepare(`DELETE FROM error_counts WHERE hour < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')`),
  ]);
  return null;
};

// error_counts_recent(p_env text) → [{ errors24h, errors3h }]
// Errors in the hour buckets that began within the last 24 hours, and within
// the last 3 hours, for one environment. Always one row.
const errorCountsRecent: RpcImpl = async (db, args) => {
  const env = args.p_env;
  if (typeof env !== "string") throw invalid("invalid input for parameter p_env");
  const { results } = await db
    .prepare(
      `SELECT
         CAST(coalesce(sum(CASE WHEN hour > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-24 hours') THEN count END), 0) AS INTEGER) AS errors24h,
         CAST(coalesce(sum(CASE WHEN hour > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 hours') THEN count END), 0) AS INTEGER) AS errors3h
       FROM error_counts
       WHERE env = ? AND hour > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-24 hours')`,
    )
    .bind(env)
    .all<Row>();
  return results;
};

export const D1_RPCS: Record<string, RpcImpl> = {
  bump_rate_limit: bumpRateLimit,
  claim_content_topics: claimContentTopics,
  content_health_issues: contentHealthIssues,
  content_health_issues_unguarded: contentHealthIssuesUnguarded,
  bump_error_count: bumpErrorCount,
  error_counts_recent: errorCountsRecent,
};
