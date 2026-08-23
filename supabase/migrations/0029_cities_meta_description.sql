-- 0029_cities_meta_description.sql
--
-- `cities` was the only content table missing a meta_description column.
-- counties, practice_areas, location_pages, blog_posts, and legal_pages all
-- got one in their original DDL; cities was skipped in 0001_init.sql.
--
-- The application has referenced cities.meta_description all along:
--   - src/lib/data/queries.ts       (city + all-cities selects, city metadata)
--   - src/app/(admin)/admin/content/cities/[id]/page.tsx + edit-form.tsx
--   - src/app/(admin)/admin/content/cities/actions.ts (update payload)
--
-- Symptom: `[queries] all-cities: column cities.meta_description does not
-- exist` in the production build log — getAllCities() failed outright, and the
-- SEO field in the city editor silently never persisted.

alter table cities
  add column if not exists meta_description text;

comment on column cities.meta_description is
  'SEO meta description for /locations/[county]/[city]. Falls back to a generated description when null. Keep <= 160 chars.';
