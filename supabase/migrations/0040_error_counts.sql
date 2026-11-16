-- 0040_error_counts.sql — the site counts its own server errors (OPS-21).
--
-- What it stores: a whole number per environment, route group and hour.
-- Never a path, a query string, an address, a header or anything a visitor
-- typed. The Worker entry (cloudflare/worker.ts) adds one to the count when a
-- response is a 5xx; /api/health reads two sums back.
--
-- Written in the style of 0012 and 0013: RLS on, no usable policy, writes only
-- through a SECURITY DEFINER function that the service role alone may call.
-- Reads go through a second function that can return nothing but two numbers.
-- Idempotent: safe to run again.
--
-- Applied by hand in the Supabase SQL editor (DEPLOY.md, step 2b). The site
-- works the same before and after: until this runs, a failed count is dropped
-- and /api/health shows null for both numbers.
--
-- Way back: drop function bump_error_count(text, text);
--           drop function error_counts_recent(text);
--           drop table error_counts;

create table if not exists error_counts (
  env text not null,
  route text not null,
  hour timestamptz not null,
  count integer not null default 0,
  primary key (env, route, hour)
);

create index if not exists idx_error_counts_hour on error_counts (hour);

alter table error_counts enable row level security;

drop policy if exists error_counts_deny_all on error_counts;
create policy error_counts_deny_all on error_counts
  for all using (false) with check (false);

-- Adds one to the count of this environment, route group and hour, and drops
-- rows older than 30 days. Does nothing for an environment other than
-- production or staging, or a route group that is not "/word" or "/word/word"
-- of lowercase letters, digits and hyphens (at most 60 characters).
create or replace function bump_error_count(p_env text, p_route text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_env is null or p_env not in ('production', 'staging') then
    return;
  end if;
  if p_route is null
     or length(p_route) > 60
     or p_route !~ '^/[a-z0-9-]+(/[a-z0-9-]+)?$' then
    return;
  end if;

  insert into error_counts (env, route, hour, count)
  values (p_env, p_route, date_trunc('hour', now()), 1)
  on conflict (env, route, hour) do update
    set count = error_counts.count + 1;

  delete from error_counts where hour < now() - interval '30 days';
end;
$$;

-- Service-role only. anon and authenticated cannot call it.
revoke execute on function public.bump_error_count(text, text) from public;
revoke execute on function public.bump_error_count(text, text) from anon;
revoke execute on function public.bump_error_count(text, text) from authenticated;
grant  execute on function public.bump_error_count(text, text) to service_role;

-- Two whole numbers for one environment: errors in the hour buckets that began
-- within the last 24 hours, and within the last 3 hours. Public read, because
-- /api/health uses the anon key (never the service role). It can return
-- nothing else.
create or replace function error_counts_recent(p_env text)
returns table (errors24h integer, errors3h integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(sum(count) filter (where hour > now() - interval '24 hours'), 0)::integer,
    coalesce(sum(count) filter (where hour > now() - interval '3 hours'), 0)::integer
  from error_counts
  where env = p_env
    and hour > now() - interval '24 hours';
$$;

revoke execute on function public.error_counts_recent(text) from public;
grant  execute on function public.error_counts_recent(text) to anon, authenticated, service_role;

-- One proof row for staging, so the write and the read can be checked end to
-- end without causing an error on purpose (OPS-21, proof 3). Production is
-- not touched.
select bump_error_count('staging', '/selftest');

-- Make PostgREST see the two new functions at once.
notify pgrst, 'reload schema';
