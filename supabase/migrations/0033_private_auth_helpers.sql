-- 0033: take the SECURITY DEFINER auth helpers off the public API surface.
--
-- Supabase's security advisor flags is_admin(), is_owner() and
-- content_health_issues() because PostgREST exposes every function in the
-- `public` schema at /rest/v1/rpc/<name>, callable by anon and authenticated.
--
-- is_admin() / is_owner() must stay executable by anon and authenticated:
-- every RLS policy on the content tables calls them, and policies run as the
-- querying role. Moving them to a schema PostgREST does not expose keeps the
-- policies working (they reference the functions by OID) while removing the
-- RPC endpoints. content_health_issues() is only ever called by a signed-in
-- admin from the SEO command center, so anon loses EXECUTE on it.

create schema if not exists app_private;
comment on schema app_private is
  'Helpers that RLS policies call. Not exposed through PostgREST.';
grant usage on schema app_private to anon, authenticated, service_role;

alter function public.is_admin() set schema app_private;
alter function public.is_owner() set schema app_private;

-- Existing EXECUTE grants move with the functions; make them explicit.
revoke execute on function app_private.is_admin() from public;
revoke execute on function app_private.is_owner() from public;
grant execute on function app_private.is_admin() to anon, authenticated, service_role;
grant execute on function app_private.is_owner() to anon, authenticated, service_role;

create or replace function public.content_health_issues()
returns table (entity text, entity_id uuid, label text, issue text, severity text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not app_private.is_admin() then
    return;
  end if;
  return query select * from content_health_issues_unguarded();
end;
$$;

revoke execute on function public.content_health_issues() from public, anon;
grant execute on function public.content_health_issues() to authenticated, service_role;

notify pgrst, 'reload schema';
