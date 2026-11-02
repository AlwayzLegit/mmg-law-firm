-- 0039: intake admins read content and settings but can't change them.
--
-- The invite form describes intake as "read leads only", but every content
-- table's admin policy was `for all using (is_admin())`, so an intake account
-- could edit or delete blog posts, legal pages, firm contact details and
-- redirects. Server actions now call requireEditor() (owner or staff); this
-- is the matching database rule for anything that writes as the signed-in
-- user rather than the service role.
--
-- Each `<table>_admin_all` policy becomes two:
--   <table>_admin_read   select for every admin (intake can still look)
--   <table>_editor_write insert/update/delete for owner and staff
-- Lead tables (leads, lead_notes, lead_messages, tasks) are unchanged: intake
-- works leads.

create or replace function app_private.is_editor() returns boolean as $$
  select exists (
    select 1 from public.admin_profiles
    where user_id = auth.uid() and role in ('owner', 'staff')
  );
$$ language sql stable security definer set search_path = public;

revoke execute on function app_private.is_editor() from public;
grant execute on function app_private.is_editor() to anon, authenticated, service_role;

do $$
declare
  t text;
begin
  foreach t in array array[
    'blog_posts', 'case_results', 'cities', 'counties', 'legal_pages',
    'location_pages', 'practice_areas', 'testimonials', 'attorney_profiles',
    'firm_settings', 'message_templates', 'content_topics',
    'agent_instructions', 'agent_questions'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_editor_write', t);
    execute format(
      'create policy %I on public.%I for select using (app_private.is_admin())',
      t || '_admin_read', t);
    execute format(
      'create policy %I on public.%I for all using (app_private.is_editor()) with check (app_private.is_editor())',
      t || '_editor_write', t);
  end loop;
end $$;

drop policy if exists "redirects admin write" on public.redirects;
create policy "redirects admin write" on public.redirects
  for all using (app_private.is_editor()) with check (app_private.is_editor());

drop policy if exists attorney_headshots_admin_write on storage.objects;
create policy attorney_headshots_admin_write on storage.objects
  for insert with check (
    bucket_id = 'attorney-headshots' and app_private.is_editor()
  );

drop policy if exists attorney_headshots_admin_update on storage.objects;
create policy attorney_headshots_admin_update on storage.objects
  for update using (
    bucket_id = 'attorney-headshots' and app_private.is_editor()
  ) with check (
    bucket_id = 'attorney-headshots' and app_private.is_editor()
  );

drop policy if exists attorney_headshots_admin_delete on storage.objects;
create policy attorney_headshots_admin_delete on storage.objects
  for delete using (
    bucket_id = 'attorney-headshots' and app_private.is_editor()
  );
