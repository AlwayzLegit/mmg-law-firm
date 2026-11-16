# Server error count (OPS-21)

The site counts its own server errors, so a burst of 5xx answers (first of all
an enquiry that could not be saved) is noticed without anyone reporting it. No
outside vendor, no new key, no new account.

## What is counted

Every answer of the app Worker with a status from 500 to 599, and every request
that makes the Worker's handler throw (counted as 500, then thrown again
unchanged). The place is the Worker entry, `cloudflare/worker.ts`, through
`withErrorCount` in `src/lib/cloudflare/error-count.ts`. It sees every answer,
including a 500 that a route builds itself (`src/app/api/leads/route.ts`
answers 500 "db-insert-failed" when a lead cannot be saved). It does not use
Next's `onRequestError`: that hook is taken by Sentry (`instrumentation.ts`),
it is not shown to fire on the Worker (`open-next.config.ts` records that it
once made every request fail), and it never sees an error a route catches itself.

The scheduled jobs (`scheduled()`) are not counted.

## What is never stored

A count per environment (`production` or `staging`), route group and hour. The
route group is at most two lowercase words: `/api/leads`, `/api/admin`,
`/admin`, `/page` or `/api/other`. Never a path, a query string, an address,
a header, a body, or anything a visitor typed. An id or an email address in a
path ends up in `/page` or `/api/other`. The database function refuses any
other shape too.

## The two functions

`supabase/migrations/0040_error_counts.sql`, applied by hand (DEPLOY.md, step 2b):

- `bump_error_count(p_env, p_route)`: adds one, drops rows older than 30 days.
  Service role only. RLS is on with a deny-all policy, as for `rate_limits`.
- `error_counts_recent(p_env)`: two whole numbers, errors in the hour buckets
  that began within the last 24 hours and the last 3 hours. The anon key may
  call it, and it can return nothing else.

The Worker already holds `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
as Worker secrets (`cloudflare-deploy-target.yml`, step "Worker secrets"), so
there is no new credential. A failed count is dropped: it never changes what the
visitor gets, never logs the key, the address or an answer, waits at most 2
seconds (in `ctx.waitUntil`) and sends at most 20 a minute per Worker instance.

Staging shares the production database, so every row carries the environment:
a staging Worker (site address on `staging.`) counts as `staging`.

## What shows where

- `GET /api/health` has two more keys, `errors24h` and `errors3h`, whole numbers
  or `null`. `null` means not counted: migration 0040 is not applied yet, or the
  read failed. The counts never change `ok`, `status`, `failing` or the 503: a
  503 still means that the database does not answer. The owner decided on
  2026-11-14 that the counts may be public ("counts only").
- Every counted error also writes one log line,
  `{"kind":"server-error","status":500,"route":"/api/leads","method":"POST"}`.
  In the Cloudflare dashboard (Workers Logs are on) filter on `server-error`.
- The Health monitor probe (`scripts/health/checks.mjs`, `checkErrors`) prints
  `errors: N in 3h, N in 24h` as the last check of the run and fails at 10 or
  more in 3 hours (`--max-errors-3h`, `MAX_ERRORS_3H`). Both runners use it: the
  GitHub workflow and the monitor Worker. The short window is deliberate: the
  probe keeps nothing between runs, and a 24 hour count would keep it red for a
  day after a burst that ended. The alarm clears itself 3 hours after the errors
  stop. Before `ERRORS_QUIET_UNTIL` a count at the limit only prints a quiet
  warning (a new alarm starts quiet). No numbers yet is a warning, not a failure.

A red run with "server errors in the last 3 hours" is an Incident, P2 unless a
contact check fails too.

## Way back

- Stop counting: revert the merge commit and deploy. `/api/health` goes back to
  five keys.
- Silence only the alarm, with no deploy: run the monitor or the probe with a
  higher `--max-errors-3h`.
- Remove the table and the functions (owner, Supabase SQL editor):
  `drop function bump_error_count(text, text); drop function error_counts_recent(text); drop table error_counts;`
  They do nothing on their own, so this can wait.
