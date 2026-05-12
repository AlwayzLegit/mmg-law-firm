-- 0009_security_hardening.sql — address WARN-level lints from get_advisors.
--
-- Generated after the initial production deploy revealed three low-impact
-- but worth-fixing security warnings. Idempotent — safe to re-run.

-- 1) Pin the search_path for the trigger function so it can't be hijacked
-- by a search-path manipulation attack.
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) Drop the broad public SELECT policy on the attorney-headshots bucket.
-- Public buckets don't need it for object URL access, and removing it stops
-- anonymous clients from listing/enumerating uploaded files via the
-- storage.objects API. The /storage/v1/object/public/... endpoint still
-- serves files directly because the bucket is marked public.
drop policy if exists attorney_headshots_public_read on storage.objects;

-- 3) is_admin() is intended only for internal use by RLS policies. Revoke
-- EXECUTE from anon and authenticated so the function can't be invoked as
-- an RPC at /rest/v1/rpc/is_admin to probe admin status from outside. RLS
-- policies still call it via SECURITY DEFINER.
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_admin() from authenticated;
