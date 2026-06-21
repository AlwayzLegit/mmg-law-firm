-- 0019: Scaffold priority city × practice landing pages as UNPUBLISHED drafts.
--
-- Source: docs/seo-keyword-targets.md (Semrush competitor keyword-gap). These
-- are the highest-value Glendale/LA combinations to build next: rideshare
-- (Uber/Lyft), truck, motorcycle, wrongful death, slip-and-fall, bicycle.
-- Car-accident pages for these cities already exist (migration 0014).
--
-- IMPORTANT — these are EMPTY drafts on purpose:
--   * is_published = false
--   * local_angle_md = NULL  → the publish guards (admin per-page control and
--     bulkSetLocationPagePublished) refuse to publish a row without a non-empty
--     local angle, so these CANNOT go live until an attorney writes real,
--     city-specific content (spec §17 hard rule #1; no invented content per #6/#7).
--   * intro_md carries a one-line TODO(human) pointer only — it never reaches
--     the public site because the row cannot be published while local_angle_md
--     is empty.
--
-- The attorney fills each at /admin/content/location-pages, writes a genuinely
-- local local_angle_md (real freeways, corridors, courthouses — no templated
-- sentences, no invented statistics), then publishes.
--
-- Re-runnable: ON CONFLICT (city_id, practice_area_id) DO NOTHING, so existing
-- rows (e.g. the published car-accident pages) are never touched.

insert into location_pages (city_id, practice_area_id, intro_md, local_angle_md, is_published)
select c.id, pa.id,
  '> TODO(human): SEO-priority draft (see docs/seo-keyword-targets.md). Write a unique, city-specific local angle for '
    || c.name || ' ' || pa.name
    || ', then publish. No invented stats; CRPC §7.1.',
  null,
  false
from cities c
cross join practice_areas pa
where c.slug in ('glendale', 'los-angeles')
  and pa.slug in (
    'rideshare-accidents',
    'truck-accidents',
    'motorcycle-accidents',
    'wrongful-death',
    'slip-and-fall',
    'bicycle-accidents'
  )
on conflict (city_id, practice_area_id) do nothing;
