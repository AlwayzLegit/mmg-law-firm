-- Content-health RPC for the admin SEO command center. Returns one row per
-- content problem (missing/over-length meta, thin copy, draft needing a local
-- angle, genuinely-overdue review) across the content tables. Length-based
-- checks need SQL length(), which the JS client can't express in a filter, so
-- this lives in the database. Admin-only via an is_admin() guard.

create or replace function content_health_issues()
returns table (
  entity text,
  entity_id uuid,
  label text,
  issue text,
  severity text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    return;
  end if;

  -- ---- location pages (published) ----
  return query
  select 'location_page', lp.id,
         coalesce(c.name, '?') || ' · ' || coalesce(pa.name, '?'),
         'Missing meta description', 'high'
  from location_pages lp
  left join cities c on c.id = lp.city_id
  left join practice_areas pa on pa.id = lp.practice_area_id
  where lp.is_published
    and (lp.meta_description is null or length(lp.meta_description) = 0);

  return query
  select 'location_page', lp.id,
         coalesce(c.name, '?') || ' · ' || coalesce(pa.name, '?'),
         'Meta too long (' || length(lp.meta_description) || ' chars)', 'medium'
  from location_pages lp
  left join cities c on c.id = lp.city_id
  left join practice_areas pa on pa.id = lp.practice_area_id
  where lp.is_published and length(lp.meta_description) > 160;

  return query
  select 'location_page', lp.id,
         coalesce(c.name, '?') || ' · ' || coalesce(pa.name, '?'),
         'Thin local angle (' || coalesce(length(lp.local_angle_md), 0) || ' chars)', 'medium'
  from location_pages lp
  left join cities c on c.id = lp.city_id
  left join practice_areas pa on pa.id = lp.practice_area_id
  where lp.is_published and coalesce(length(lp.local_angle_md), 0) < 200;

  -- Overdue review: only pages reviewed >1y ago, or never reviewed but live
  -- for >1y. Avoids flagging every freshly-built page as "stale".
  return query
  select 'location_page', lp.id,
         coalesce(c.name, '?') || ' · ' || coalesce(pa.name, '?'),
         'Overdue for review', 'low'
  from location_pages lp
  left join cities c on c.id = lp.city_id
  left join practice_areas pa on pa.id = lp.practice_area_id
  where lp.is_published
    and (
      lp.last_reviewed_at < now() - interval '365 days'
      or (lp.last_reviewed_at is null and lp.created_at < now() - interval '365 days')
    );

  -- Draft city × practice pages that can't publish without a local angle.
  return query
  select 'location_page', lp.id,
         coalesce(c.name, '?') || ' · ' || coalesce(pa.name, '?'),
         'Draft — needs local angle to publish', 'low'
  from location_pages lp
  left join cities c on c.id = lp.city_id
  left join practice_areas pa on pa.id = lp.practice_area_id
  where not lp.is_published and lp.local_angle_md is null;

  -- ---- counties ----
  return query
  select 'county', c.id, c.name, 'Missing meta description', 'high'
  from counties c
  where c.is_published
    and (c.meta_description is null or length(c.meta_description) = 0);

  return query
  select 'county', c.id, c.name,
         'Meta too long (' || length(c.meta_description) || ' chars)', 'medium'
  from counties c
  where c.is_published and length(c.meta_description) > 160;

  return query
  select 'county', c.id, c.name,
         'Thin intro (' || coalesce(length(c.intro_md), 0) || ' chars)', 'low'
  from counties c
  where c.is_published and coalesce(length(c.intro_md), 0) < 200;

  -- ---- practice areas ----
  return query
  select 'practice_area', pa.id, pa.name, 'Missing meta description', 'high'
  from practice_areas pa
  where pa.is_published
    and (pa.meta_description is null or length(pa.meta_description) = 0);

  return query
  select 'practice_area', pa.id, pa.name,
         'Meta too long (' || length(pa.meta_description) || ' chars)', 'medium'
  from practice_areas pa
  where pa.is_published and length(pa.meta_description) > 160;

  -- ---- blog posts ----
  return query
  select 'blog', b.id, b.title, 'Missing meta description', 'high'
  from blog_posts b
  where b.is_published
    and (b.meta_description is null or length(b.meta_description) = 0);

  return query
  select 'blog', b.id, b.title,
         'Meta too long (' || length(b.meta_description) || ' chars)', 'medium'
  from blog_posts b
  where b.is_published and length(b.meta_description) > 160;

  return query
  select 'blog', b.id, b.title,
         'Thin body (' || coalesce(length(b.body_md), 0) || ' chars)', 'low'
  from blog_posts b
  where b.is_published and coalesce(length(b.body_md), 0) < 500;
end;
$$;

grant execute on function content_health_issues() to authenticated;
