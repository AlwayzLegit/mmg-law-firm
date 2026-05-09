-- 0002_rls.sql — RLS policies. Public-read for published content, admin-only
-- for everything else. Public lead inserts go through the API route using
-- the service-role key (which bypasses RLS).

-- Helper: is the calling user a member of admin_profiles?
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from admin_profiles where user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

-- =========================================================================
-- Geography & content tables: public read when published, admin all.
-- =========================================================================

alter table counties enable row level security;
drop policy if exists counties_public_read on counties;
drop policy if exists counties_admin_all on counties;
create policy counties_public_read on counties
  for select using (is_published);
create policy counties_admin_all on counties
  for all using (is_admin()) with check (is_admin());

alter table cities enable row level security;
drop policy if exists cities_public_read on cities;
drop policy if exists cities_admin_all on cities;
create policy cities_public_read on cities
  for select using (is_published);
create policy cities_admin_all on cities
  for all using (is_admin()) with check (is_admin());

alter table practice_areas enable row level security;
drop policy if exists practice_areas_public_read on practice_areas;
drop policy if exists practice_areas_admin_all on practice_areas;
create policy practice_areas_public_read on practice_areas
  for select using (is_published);
create policy practice_areas_admin_all on practice_areas
  for all using (is_admin()) with check (is_admin());

alter table location_pages enable row level security;
drop policy if exists location_pages_public_read on location_pages;
drop policy if exists location_pages_admin_all on location_pages;
-- A location page is publicly visible only when both is_published AND
-- local_angle_md is non-empty. This enforces spec §17 hard rule #1 at the
-- DB layer in addition to the application layer.
create policy location_pages_public_read on location_pages
  for select using (
    is_published
    and local_angle_md is not null
    and length(trim(local_angle_md)) > 0
  );
create policy location_pages_admin_all on location_pages
  for all using (is_admin()) with check (is_admin());

alter table blog_posts enable row level security;
drop policy if exists blog_posts_public_read on blog_posts;
drop policy if exists blog_posts_admin_all on blog_posts;
create policy blog_posts_public_read on blog_posts
  for select using (
    is_published
    and (published_at is null or published_at <= now())
  );
create policy blog_posts_admin_all on blog_posts
  for all using (is_admin()) with check (is_admin());

alter table testimonials enable row level security;
drop policy if exists testimonials_public_read on testimonials;
drop policy if exists testimonials_admin_all on testimonials;
create policy testimonials_public_read on testimonials
  for select using (is_approved);
create policy testimonials_admin_all on testimonials
  for all using (is_admin()) with check (is_admin());

alter table case_results enable row level security;
drop policy if exists case_results_public_read on case_results;
drop policy if exists case_results_admin_all on case_results;
create policy case_results_public_read on case_results
  for select using (is_published);
create policy case_results_admin_all on case_results
  for all using (is_admin()) with check (is_admin());

-- =========================================================================
-- Leads: NO public read. Admins can do anything. Public submissions go
-- through the /api/leads route using the service-role key, bypassing RLS.
-- =========================================================================

alter table leads enable row level security;
drop policy if exists leads_admin_all on leads;
create policy leads_admin_all on leads
  for all using (is_admin()) with check (is_admin());

alter table lead_notes enable row level security;
drop policy if exists lead_notes_admin_all on lead_notes;
create policy lead_notes_admin_all on lead_notes
  for all using (is_admin()) with check (is_admin());

alter table audit_log enable row level security;
drop policy if exists audit_admin_read on audit_log;
create policy audit_admin_read on audit_log
  for select using (is_admin());

alter table admin_profiles enable row level security;
drop policy if exists admin_profiles_self on admin_profiles;
drop policy if exists admin_profiles_admin_all on admin_profiles;
create policy admin_profiles_self on admin_profiles
  for select using (auth.uid() = user_id);
create policy admin_profiles_admin_all on admin_profiles
  for all using (is_admin()) with check (is_admin());
