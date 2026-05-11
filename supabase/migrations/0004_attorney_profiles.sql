-- 0004_attorney_profiles.sql — DB-backed attorney bio.
--
-- Replaces the hardcoded values in src/lib/constants.ts and the placeholder
-- copy in src/app/(marketing)/attorneys/mihran-ghazaryan/page.tsx with a row
-- the attorney can edit through /admin/content/attorneys/[id].
--
-- Spec hard rules #6/#7: never invent attorney credentials. Bio body, bar
-- admission date, education, and federal-court admissions are seeded as
-- empty/null — the attorney fills them in before the page is published.

create table if not exists attorney_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  full_name text not null,
  display_name text,                 -- e.g. "Mihran" for casual reference
  job_title text,                    -- e.g. "Founder & Lead Attorney"

  -- Bar
  bar_state text not null default 'California',
  bar_number text not null,
  bar_admission_date date,

  -- Headshot (Supabase Storage public URL or external)
  headshot_url text,
  headshot_alt text,

  -- Copy
  short_bio text,                    -- 1–2 sentence card summary
  bio_md text,                       -- long-form bio for the bio page

  -- Education
  law_school text,
  law_school_year int,
  undergrad_school text,
  undergrad_degree text,
  undergrad_year int,

  -- Practice
  federal_court_admissions text[] not null default '{}',
  bar_associations text[] not null default '{}',
  honors_md text,                    -- free-form awards / recognition

  -- Languages spoken in client-facing matters
  languages text[] not null default '{}',

  -- External profiles for `sameAs` JSON-LD
  avvo_url text,
  justia_url text,
  linkedin_url text,
  super_lawyers_url text,

  display_order int not null default 100,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_attorney_profiles_slug
  on attorney_profiles (slug);
create index if not exists idx_attorney_profiles_published
  on attorney_profiles (is_published) where is_published = true;

-- Reuse the set_updated_at() trigger function from 0001_init.sql.
drop trigger if exists trg_attorney_profiles_set_updated_at
  on attorney_profiles;
create trigger trg_attorney_profiles_set_updated_at
  before update on attorney_profiles
  for each row execute function set_updated_at();

-- =========================================================================
-- RLS — public read when published, admin all. Mirrors 0002_rls.sql.
-- =========================================================================

alter table attorney_profiles enable row level security;

drop policy if exists attorney_profiles_public_read on attorney_profiles;
drop policy if exists attorney_profiles_admin_all on attorney_profiles;

create policy attorney_profiles_public_read on attorney_profiles
  for select using (is_published);
create policy attorney_profiles_admin_all on attorney_profiles
  for all using (is_admin()) with check (is_admin());

-- =========================================================================
-- Storage bucket for attorney headshots. Public-read so next/image can fetch
-- without signed URLs. Writes restricted to admins.
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('attorney-headshots', 'attorney-headshots', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists attorney_headshots_public_read on storage.objects;
drop policy if exists attorney_headshots_admin_write on storage.objects;
drop policy if exists attorney_headshots_admin_update on storage.objects;
drop policy if exists attorney_headshots_admin_delete on storage.objects;

create policy attorney_headshots_public_read on storage.objects
  for select using (bucket_id = 'attorney-headshots');

create policy attorney_headshots_admin_write on storage.objects
  for insert with check (
    bucket_id = 'attorney-headshots' and is_admin()
  );

create policy attorney_headshots_admin_update on storage.objects
  for update using (
    bucket_id = 'attorney-headshots' and is_admin()
  ) with check (
    bucket_id = 'attorney-headshots' and is_admin()
  );

create policy attorney_headshots_admin_delete on storage.objects
  for delete using (
    bucket_id = 'attorney-headshots' and is_admin()
  );

-- =========================================================================
-- Seed: Mihran's row, with only the verified facts populated.
-- The attorney fills the rest in via /admin/content/attorneys before
-- toggling is_published = true.
-- =========================================================================

insert into attorney_profiles (
  slug, full_name, display_name, job_title,
  bar_state, bar_number,
  languages,
  is_published
)
values (
  'mihran-ghazaryan',
  'Mihran M. Ghazaryan',
  'Mihran',
  'Founder & Lead Attorney',
  'California',
  '311455',
  array['English', 'Armenian', 'Russian'],
  false
)
on conflict (slug) do nothing;
