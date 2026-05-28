-- 0012_rate_limits.sql — Postgres-backed rate limiter.
--
-- Replaces the per-serverless-instance in-memory limiter in
-- src/lib/rate-limit.ts so multiple Vercel lambdas share one bucket.
-- Keyed by an opaque string (e.g. `leads:1.2.3.4`); writes happen via
-- the service-role client from /api/leads, so RLS is denied for
-- everyone else.

create table if not exists rate_limits (
  key text primary key,
  count int not null default 1,
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_window
  on rate_limits (window_started_at);

alter table rate_limits enable row level security;

-- No public policies. Only the service-role key (which bypasses RLS)
-- can read/write. A misconfigured admin role cannot inadvertently
-- expose IPs of recent submitters.

-- Atomic increment-or-reset. Returns the new count and the window
-- start so the caller can decide whether to allow / retry.
--
-- Behavior:
--   * Insert a fresh row when none exists, count=1.
--   * Same window (now - window_started_at < window_seconds): bump count.
--   * Window expired: reset count=1 and window_started_at=now().
create or replace function bump_rate_limit(
  p_key text,
  p_window_seconds int
)
returns table (count int, window_started_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into rate_limits (key, count, window_started_at)
  values (p_key, 1, now())
  on conflict (key) do update
    set
      count = case
        when now() - rate_limits.window_started_at
             > make_interval(secs => p_window_seconds)
          then 1
        else rate_limits.count + 1
      end,
      window_started_at = case
        when now() - rate_limits.window_started_at
             > make_interval(secs => p_window_seconds)
          then now()
        else rate_limits.window_started_at
      end,
      updated_at = now();

  return query
    select r.count, r.window_started_at
    from rate_limits r
    where r.key = p_key;
end;
$$;

-- Service-role only — anon and authenticated cannot call this RPC.
revoke execute on function public.bump_rate_limit(text, int) from public;
revoke execute on function public.bump_rate_limit(text, int) from anon;
revoke execute on function public.bump_rate_limit(text, int) from authenticated;
grant  execute on function public.bump_rate_limit(text, int) to service_role;
