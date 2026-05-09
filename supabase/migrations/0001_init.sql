-- 0001_init.sql — schema (RLS lives in 0002_rls.sql, seed in 0003_seed_geo.sql)
-- Replicates the DDL from CLAUDE.md §5.1.

create extension if not exists "pgcrypto";

-- =========================================================================
-- Geography
-- =========================================================================

create table if not exists counties (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_name text not null,
  fips text,
  population int,
  seat text,
  superior_court_address text,
  chp_district text,
  region text,
  meta_description text,
  intro_md text,
  local_stats_md text,
  hero_image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  county_id uuid not null references counties(id) on delete restrict,
  slug text not null,
  name text not null,
  population int,
  lat numeric(9, 6),
  lng numeric(9, 6),
  is_incorporated boolean not null default true,
  intro_md text,
  local_stats_md text,
  hero_image_url text,
  is_published boolean not null default false,
  is_priority boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (county_id, slug)
);

create table if not exists practice_areas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_name text not null,
  noun_singular text not null,
  noun_plural text not null,
  lawyer_phrase text not null,
  icon text,
  intro_md text,
  body_md text,
  faq_json jsonb not null default '[]'::jsonb,
  meta_description text,
  display_order int not null default 100,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- City × practice-area editorial content. Each (city_id, practice_area_id)
-- combination requires a `local_angle_md` populated to publish — see spec §17.
create table if not exists location_pages (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities(id) on delete cascade,
  practice_area_id uuid not null references practice_areas(id) on delete cascade,
  intro_md text,
  local_angle_md text,
  faq_json jsonb not null default '[]'::jsonb,
  case_result_ids uuid[] not null default '{}',
  meta_description text,
  is_published boolean not null default false,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, practice_area_id)
);

-- =========================================================================
-- Editorial / content
-- =========================================================================

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  hero_image_url text,
  body_md text not null,
  excerpt text,
  author_name text not null default 'Mihran M. Ghazaryan',
  tags text[] not null default '{}',
  practice_area_ids uuid[] not null default '{}',
  related_county_ids uuid[] not null default '{}',
  meta_description text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  client_initials text not null,
  city text,
  practice_area_id uuid references practice_areas(id),
  quote text not null,
  rating int check (rating between 1 and 5),
  source text,
  is_approved boolean not null default false,
  approved_at timestamptz,
  display_order int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists case_results (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  amount_cents bigint,
  amount_display text,
  practice_area_id uuid references practice_areas(id),
  county_id uuid references counties(id),
  year int,
  anonymized_summary_md text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Leads (the intake pipeline)
-- =========================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type lead_status as enum (
      'new', 'contacted', 'qualified', 'signed', 'rejected', 'spam'
    );
  end if;
end$$;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),

  -- contact
  full_name text not null,
  email text,
  phone text not null,
  preferred_contact text check (preferred_contact in ('phone', 'email', 'text')),

  -- case
  practice_area_id uuid references practice_areas(id),
  county_id uuid references counties(id),
  city_id uuid references cities(id),
  incident_date date,
  description text,
  injured boolean,
  has_attorney boolean not null default false,

  -- TCPA consent snapshot (required to defeat a future challenge)
  consent_contact boolean not null default false,
  consent_text text,
  consent_ip inet,
  consent_ts timestamptz,

  -- attribution
  source_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  gclid text,
  referrer text,
  user_agent text,

  -- pipeline
  status lead_status not null default 'new',
  assigned_to uuid references auth.users(id),
  rejection_reason text,
  conflict_checked_at timestamptz,
  conflict_clear boolean,

  -- timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  author_id uuid references auth.users(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  entity text not null,
  entity_id uuid,
  action text not null,
  diff jsonb,
  ip inet,
  ts timestamptz not null default now()
);

-- Admin user metadata. After first deploy, manually insert a row mapping
-- your auth.users.id to role='owner'.
create table if not exists admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'staff', 'intake')),
  full_name text,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Indexes
-- =========================================================================

create index if not exists idx_cities_county on cities (county_id);
create index if not exists idx_cities_slug on cities (slug);
create index if not exists idx_cities_published
  on cities (is_published) where is_published = true;

create index if not exists idx_location_pages_city_practice
  on location_pages (city_id, practice_area_id);
create index if not exists idx_location_pages_published
  on location_pages (is_published) where is_published = true;

create index if not exists idx_leads_status on leads (status);
create index if not exists idx_leads_created on leads (created_at desc);
create index if not exists idx_leads_county on leads (county_id);

create index if not exists idx_blog_published_date
  on blog_posts (is_published, published_at desc);

-- =========================================================================
-- Triggers — keep updated_at honest on tables that expose it.
-- =========================================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
  tables text[] := array['counties','cities','practice_areas','location_pages','blog_posts','leads'];
begin
  foreach t in array tables loop
    execute format(
      'drop trigger if exists trg_%s_set_updated_at on %s; '
      'create trigger trg_%s_set_updated_at before update on %s '
      'for each row execute function set_updated_at();',
      t, t, t, t
    );
  end loop;
end$$;
