-- OPS-362 (part 1 of OPS-353): the MMG Law D1 (SQLite) schema.
--
-- Source: supabase/migrations/0001 to 0040 applied in file order (the schema as
-- it stands after 0040, 27 tables; trusted_devices was created by 0015 and
-- dropped by 0034, so it is not here). Same table and column names as Supabase,
-- so rows can be copied 1:1 in a later part. The ported client in
-- src/lib/db/d1Client.ts reads src/lib/db/d1Schema.generated.ts, which
-- scripts/cloudflare/gen-d1-schema-map.mjs builds from this file.
--
-- NOTHING READS THIS YET. No D1 database exists for MMG Law, no wrangler binding
-- names one, and DATA_PROVIDER stays "supabase" (the default). Production and
-- staging keep running on Supabase. Tables and indexes only.
--
-- Conventions (the same as The Look's migrations/d1/0001_core.sql, OPS-362 ported them):
--   * ids are TEXT UUIDs; generated ids default to a random UUIDv4 from randomblob().
--   * timestamptz is ISO-8601 UTC TEXT, default strftime('%Y-%m-%dT%H:%M:%fZ','now').
--     date is TEXT 'YYYY-MM-DD'. inet is TEXT.
--   * boolean is INTEGER 0/1 with CHECK (col IN (0, 1)).
--   * jsonb and Postgres arrays (text[], uuid[]) are TEXT checked with json_valid();
--     arrays are JSON arrays, '{}'::text[] -> '[]'.
--   * numeric is REAL; bigint and int are INTEGER; enums are TEXT with a CHECK.
--
-- Left out on purpose, and where each goes (part 2 of OPS-353 unless it says otherwise):
--   * 49 row-level-security policies: D1 has none; the Worker is the only client, so
--     each policy becomes a server-side check with a test per route.
--   * Foreign keys to auth.users (assigned_to, author_id, created_by, owner_id,
--     answered_by, actor_id, admin_profiles.user_id): the column stays as TEXT with no
--     foreign key. Sign-in moves to Better Auth in a later part, which owns the user ids.
--   * Functions: bump_rate_limit, claim_content_topics, content_health_issues(_unguarded),
--     bump_error_count, error_counts_recent, is_admin, is_owner, is_editor. The client
--     answers PGRST202 for an RPC not moved yet.
--   * agent_instructions.version was a sequence default (nextval); here the caller must
--     supply it (an insert without it fails with a not-null error, loudly).
--   * Seed rows (geography, practice areas, legal pages, message templates, redirects,
--     the attorney profile, firm_settings row) come with the data copy, not here.
--   * Storage buckets (media, attorney-headshots): R2, a later part.

-- =====================================================================
-- Geography
-- =====================================================================

CREATE TABLE IF NOT EXISTS counties (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  slug                     TEXT NOT NULL UNIQUE,
  name                     TEXT NOT NULL,
  short_name               TEXT NOT NULL,
  fips                     TEXT,
  population               INTEGER,
  seat                     TEXT,
  superior_court_address   TEXT,
  chp_district             TEXT,
  region                   TEXT,
  meta_description         TEXT,
  intro_md                 TEXT,
  local_stats_md           TEXT,
  hero_image_url           TEXT,
  is_published             INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS cities (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  county_id                TEXT NOT NULL REFERENCES counties (id) ON DELETE RESTRICT,
  slug                     TEXT NOT NULL,
  name                     TEXT NOT NULL,
  population               INTEGER,
  lat                      REAL,
  lng                      REAL,
  is_incorporated          INTEGER NOT NULL DEFAULT 1 CHECK (is_incorporated IN (0, 1)),
  intro_md                 TEXT,
  local_stats_md           TEXT,
  hero_image_url           TEXT,
  is_published             INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  is_priority              INTEGER NOT NULL DEFAULT 0 CHECK (is_priority IN (0, 1)),
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  meta_description         TEXT,
  UNIQUE (county_id, slug)
);

CREATE TABLE IF NOT EXISTS practice_areas (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  slug                     TEXT NOT NULL UNIQUE,
  name                     TEXT NOT NULL,
  short_name               TEXT NOT NULL,
  noun_singular            TEXT NOT NULL,
  noun_plural              TEXT NOT NULL,
  lawyer_phrase            TEXT NOT NULL,
  icon                     TEXT,
  intro_md                 TEXT,
  body_md                  TEXT,
  faq_json                 TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(faq_json)),
  meta_description         TEXT,
  display_order            INTEGER NOT NULL DEFAULT 100,
  is_published             INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  subtopics_json           TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(subtopics_json)),
  what_to_do_json          TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(what_to_do_json))
);

CREATE TABLE IF NOT EXISTS location_pages (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  city_id                  TEXT NOT NULL REFERENCES cities (id) ON DELETE CASCADE,
  practice_area_id         TEXT NOT NULL REFERENCES practice_areas (id) ON DELETE CASCADE,
  intro_md                 TEXT,
  local_angle_md           TEXT,
  faq_json                 TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(faq_json)),
  case_result_ids          TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(case_result_ids)),
  meta_description         TEXT,
  is_published             INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  last_reviewed_at         TEXT,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (city_id, practice_area_id)
);

-- =====================================================================
-- Editorial and content
-- =====================================================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  slug                     TEXT NOT NULL UNIQUE,
  title                    TEXT NOT NULL,
  subtitle                 TEXT,
  hero_image_url           TEXT,
  body_md                  TEXT NOT NULL,
  excerpt                  TEXT,
  author_name              TEXT NOT NULL DEFAULT 'Mihran M. Ghazaryan',
  tags                     TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
  practice_area_ids        TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(practice_area_ids)),
  related_county_ids       TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(related_county_ids)),
  meta_description         TEXT,
  is_published             INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  published_at             TEXT,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary_keyword          TEXT,
  secondary_keywords       TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(secondary_keywords)),
  hero_image_alt           TEXT,
  review_status            TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'needs_review', 'approved', 'published', 'rejected')),
  topic_id                 TEXT REFERENCES content_topics (id) ON DELETE SET NULL,
  created_via              TEXT NOT NULL DEFAULT 'admin' CHECK (created_via IN ('admin', 'admin_api', 'agent', 'seed')),
  -- Postgres: stored generated column over regexp_split_to_array(btrim(body_md), '\s+'). SQLite has no
  -- regex split, so words = (spaces after turning tab, CR and LF into spaces) + 1. A run of several
  -- spaces over-counts slightly. Never written by the app.
  word_count               INTEGER GENERATED ALWAYS AS (CASE WHEN length(trim(body_md)) = 0 THEN 0 ELSE length(replace(replace(replace(trim(body_md), char(9), ' '), char(13), ' '), char(10), ' ')) - length(replace(replace(replace(replace(trim(body_md), char(9), ' '), char(13), ' '), char(10), ' '), ' ', '')) + 1 END) STORED
);

CREATE TABLE IF NOT EXISTS testimonials (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  client_initials          TEXT NOT NULL,
  city                     TEXT,
  practice_area_id         TEXT REFERENCES practice_areas (id),
  quote                    TEXT NOT NULL,
  rating                   INTEGER CHECK (rating BETWEEN 1 AND 5),
  source                   TEXT,
  is_approved              INTEGER NOT NULL DEFAULT 0 CHECK (is_approved IN (0, 1)),
  approved_at              TEXT,
  display_order            INTEGER NOT NULL DEFAULT 100,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS case_results (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  headline                 TEXT NOT NULL,
  amount_cents             INTEGER,
  amount_display           TEXT,
  practice_area_id         TEXT REFERENCES practice_areas (id),
  county_id                TEXT REFERENCES counties (id),
  year                     INTEGER,
  anonymized_summary_md    TEXT NOT NULL,
  is_published             INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS attorney_profiles (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  slug                     TEXT NOT NULL UNIQUE,
  full_name                TEXT NOT NULL,
  display_name             TEXT,
  job_title                TEXT,
  bar_state                TEXT NOT NULL DEFAULT 'California',
  bar_number               TEXT NOT NULL,
  bar_admission_date       TEXT,
  headshot_url             TEXT,
  headshot_alt             TEXT,
  short_bio                TEXT,
  bio_md                   TEXT,
  law_school               TEXT,
  law_school_year          INTEGER,
  undergrad_school         TEXT,
  undergrad_degree         TEXT,
  undergrad_year           INTEGER,
  federal_court_admissions TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(federal_court_admissions)),
  bar_associations         TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(bar_associations)),
  honors_md                TEXT,
  languages                TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(languages)),
  avvo_url                 TEXT,
  justia_url               TEXT,
  linkedin_url             TEXT,
  super_lawyers_url        TEXT,
  display_order            INTEGER NOT NULL DEFAULT 100,
  is_published             INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS legal_pages (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  slug                     TEXT NOT NULL UNIQUE,
  title                    TEXT NOT NULL,
  subtitle                 TEXT,
  body_md                  TEXT NOT NULL,
  meta_description         TEXT,
  effective_date           TEXT,
  last_reviewed_at         TEXT,
  display_order            INTEGER NOT NULL DEFAULT 100,
  is_published             INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- One row, id = 1.
CREATE TABLE IF NOT EXISTS firm_settings (
  id                       INTEGER PRIMARY KEY NOT NULL DEFAULT 1 CHECK (id = 1),
  founded_year             INTEGER,
  yelp_url                 TEXT,
  super_lawyers_url        TEXT,
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  homepage_faqs_json       TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(homepage_faqs_json)),
  years_practicing         INTEGER,
  settlements_total_display TEXT,
  cases_handled_display    TEXT,
  consultations_display    TEXT
);

CREATE TABLE IF NOT EXISTS redirects (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  source_path              TEXT NOT NULL UNIQUE,
  destination              TEXT NOT NULL,
  permanent                INTEGER NOT NULL DEFAULT 1 CHECK (permanent IN (0, 1)),
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- =====================================================================
-- Leads (the intake pipeline)
-- =====================================================================

CREATE TABLE IF NOT EXISTS leads (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  full_name                TEXT NOT NULL,
  email                    TEXT,
  phone                    TEXT NOT NULL,
  preferred_contact        TEXT CHECK (preferred_contact IN ('phone', 'email', 'text')),
  practice_area_id         TEXT REFERENCES practice_areas (id),
  county_id                TEXT REFERENCES counties (id),
  city_id                  TEXT REFERENCES cities (id),
  incident_date            TEXT,
  description              TEXT,
  injured                  INTEGER CHECK (injured IN (0, 1)),
  has_attorney             INTEGER NOT NULL DEFAULT 0 CHECK (has_attorney IN (0, 1)),
  consent_contact          INTEGER NOT NULL DEFAULT 0 CHECK (consent_contact IN (0, 1)),
  consent_text             TEXT,
  consent_ip               TEXT,
  consent_ts               TEXT,
  source_url               TEXT,
  utm_source               TEXT,
  utm_medium               TEXT,
  utm_campaign             TEXT,
  utm_term                 TEXT,
  utm_content              TEXT,
  gclid                    TEXT,
  referrer                 TEXT,
  user_agent               TEXT,
  status                   TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'signed', 'rejected', 'spam')),
  assigned_to              TEXT,
  rejection_reason         TEXT,
  conflict_checked_at      TEXT,
  conflict_clear           INTEGER CHECK (conflict_clear IN (0, 1)),
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  follow_up_at             TEXT,
  merged_into              TEXT REFERENCES leads (id),
  tags                     TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
  landing_url              TEXT,
  intake                   TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(intake)),
  sla_alerted_at           TEXT
);

CREATE TABLE IF NOT EXISTS lead_notes (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  lead_id                  TEXT NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  author_id                TEXT,
  body                     TEXT NOT NULL,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  is_pinned                INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
  updated_at               TEXT
);

CREATE TABLE IF NOT EXISTS lead_saved_views (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  owner_id                 TEXT NOT NULL,
  name                     TEXT NOT NULL,
  query                    TEXT NOT NULL DEFAULT '',
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS lead_messages (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  lead_id                  TEXT NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  channel                  TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  direction                TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  author_id                TEXT,
  subject                  TEXT,
  body                     TEXT NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'received', 'opened')),
  provider_id              TEXT,
  error                    TEXT,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  lead_id                  TEXT REFERENCES leads (id) ON DELETE CASCADE,
  title                    TEXT NOT NULL,
  due_at                   TEXT,
  assigned_to              TEXT,
  done                     INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  done_at                  TEXT,
  created_by               TEXT,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS message_templates (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  label                    TEXT NOT NULL,
  channel                  TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  subject                  TEXT,
  body                     TEXT NOT NULL,
  sort_order               INTEGER NOT NULL DEFAULT 0,
  is_active                INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_by               TEXT,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- =====================================================================
-- Admin, audit, limits
-- =====================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  actor_id                 TEXT,
  entity                   TEXT NOT NULL,
  entity_id                TEXT,
  action                   TEXT NOT NULL,
  diff                     TEXT CHECK (json_valid(diff)),
  ip                       TEXT,
  ts                       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- user_id is the auth user id (a Postgres uuid today); Better Auth owns it in a later part.
CREATE TABLE IF NOT EXISTS admin_profiles (
  user_id                  TEXT PRIMARY KEY NOT NULL,
  role                     TEXT NOT NULL CHECK (role IN ('owner', 'staff', 'intake')),
  full_name                TEXT,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  password_set             INTEGER NOT NULL DEFAULT 0 CHECK (password_set IN (0, 1))
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key                      TEXT PRIMARY KEY NOT NULL,
  count                    INTEGER NOT NULL DEFAULT 1,
  window_started_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS error_counts (
  env                      TEXT NOT NULL,
  route                    TEXT NOT NULL,
  hour                     TEXT NOT NULL,
  count                    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (env, route, hour)
);

CREATE TABLE IF NOT EXISTS api_idempotency (
  principal                TEXT NOT NULL,
  idem_key                 TEXT NOT NULL,
  request_hash             TEXT NOT NULL,
  state                    TEXT NOT NULL DEFAULT 'in_progress' CHECK (state IN ('in_progress', 'done')),
  response_status          INTEGER,
  response_body            TEXT CHECK (json_valid(response_body)),
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+24 hours')),
  PRIMARY KEY (principal, idem_key)
);

-- =====================================================================
-- Content agent (0031)
-- =====================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  name                     TEXT NOT NULL,
  prefix                   TEXT NOT NULL UNIQUE,
  key_hash                 TEXT NOT NULL UNIQUE,
  scopes                   TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(scopes)),
  rate_limit_per_hour      INTEGER NOT NULL DEFAULT 600 CHECK (rate_limit_per_hour BETWEEN 1 AND 100000),
  note                     TEXT,
  created_by               TEXT,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_used_at             TEXT,
  expires_at               TEXT,
  revoked_at               TEXT
);

-- version was a sequence default (nextval); the caller supplies it here (OPS-353 part 2).
CREATE TABLE IF NOT EXISTS agent_instructions (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  version                  INTEGER NOT NULL UNIQUE,
  body_md                  TEXT NOT NULL,
  settings                 TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(settings)),
  change_note              TEXT,
  created_by               TEXT,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  agent_name               TEXT NOT NULL,
  api_key_id               TEXT REFERENCES api_keys (id) ON DELETE SET NULL,
  status                   TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed', 'needs_human')),
  started_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  heartbeat_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  finished_at              TEXT,
  instructions_version     INTEGER,
  summary_md               TEXT,
  report                   TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(report)),
  metrics                  TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metrics)),
  log                      TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(log)),
  posts_created            TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(posts_created)),
  topics_claimed           TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(topics_claimed)),
  topics_consumed          TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(topics_consumed)),
  error                    TEXT,
  meta                     TEXT CHECK (json_valid(meta))
);

CREATE TABLE IF NOT EXISTS content_topics (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  keyword                  TEXT NOT NULL,
  intent                   TEXT NOT NULL DEFAULT 'informational' CHECK (intent IN ('informational', 'supporting_post', 'local', 'faq', 'news', 'comparison')),
  practice_area_id         TEXT REFERENCES practice_areas (id) ON DELETE SET NULL,
  county_id                TEXT REFERENCES counties (id) ON DELETE SET NULL,
  city_id                  TEXT REFERENCES cities (id) ON DELETE SET NULL,
  target_url               TEXT,
  title_hint               TEXT,
  priority                 INTEGER NOT NULL DEFAULT 50,
  status                   TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'drafted', 'published', 'skipped', 'rejected')),
  source                   TEXT NOT NULL DEFAULT 'manual',
  volume                   INTEGER,
  kd                       INTEGER,
  cpc                      REAL,
  notes                    TEXT,
  claimed_by_run_id        TEXT REFERENCES agent_runs (id) ON DELETE SET NULL,
  claimed_at               TEXT,
  post_id                  TEXT REFERENCES blog_posts (id) ON DELETE SET NULL,
  created_by               TEXT,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS agent_questions (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  run_id                   TEXT NOT NULL REFERENCES agent_runs (id) ON DELETE CASCADE,
  topic_id                 TEXT REFERENCES content_topics (id) ON DELETE SET NULL,
  post_id                  TEXT REFERENCES blog_posts (id) ON DELETE SET NULL,
  kind                     TEXT NOT NULL DEFAULT 'other' CHECK (kind IN ('decision', 'fact_check', 'approval', 'blocker', 'other')),
  question                 TEXT NOT NULL,
  context                  TEXT,
  status                   TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'dismissed')),
  answer                   TEXT,
  answered_by              TEXT,
  answered_at              TEXT,
  delivered_run_id         TEXT REFERENCES agent_runs (id) ON DELETE SET NULL,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- =====================================================================
-- Indexes (the supabase migrations' indexes; partial indexes keep their WHERE;
-- the GIN index on leads.tags has no twin, the tags column is a JSON array
-- searched with json_each)
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_cities_county ON cities (county_id);
CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities (slug);
CREATE INDEX IF NOT EXISTS idx_cities_published ON cities (is_published) WHERE is_published = 1;

CREATE INDEX IF NOT EXISTS idx_location_pages_city_practice ON location_pages (city_id, practice_area_id);
CREATE INDEX IF NOT EXISTS idx_location_pages_published ON location_pages (is_published) WHERE is_published = 1;

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_county ON leads (county_id);
CREATE INDEX IF NOT EXISTS leads_follow_up_at_idx ON leads (follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_merged_into_idx ON leads (merged_into);
CREATE INDEX IF NOT EXISTS leads_sla_pending_idx ON leads (created_at)
  WHERE status = 'new' AND sla_alerted_at IS NULL AND merged_into IS NULL;

CREATE INDEX IF NOT EXISTS idx_blog_published_date ON blog_posts (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_needs_review_idx ON blog_posts (created_at) WHERE review_status = 'needs_review';

CREATE INDEX IF NOT EXISTS idx_attorney_profiles_slug ON attorney_profiles (slug);
CREATE INDEX IF NOT EXISTS idx_attorney_profiles_published ON attorney_profiles (is_published) WHERE is_published = 1;

CREATE INDEX IF NOT EXISTS idx_legal_pages_slug ON legal_pages (slug);
CREATE INDEX IF NOT EXISTS idx_legal_pages_published ON legal_pages (is_published) WHERE is_published = 1;

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window_started_at);
CREATE INDEX IF NOT EXISTS lead_saved_views_owner_idx ON lead_saved_views (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_notes_lead_pinned_idx ON lead_notes (lead_id, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_messages_lead_idx ON lead_messages (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_messages_provider_idx ON lead_messages (provider_id);

CREATE INDEX IF NOT EXISTS tasks_open_due_idx ON tasks (due_at) WHERE done = 0;
CREATE INDEX IF NOT EXISTS tasks_lead_idx ON tasks (lead_id);
CREATE INDEX IF NOT EXISTS tasks_assignee_open_idx ON tasks (assigned_to) WHERE done = 0;
CREATE INDEX IF NOT EXISTS message_templates_active_idx ON message_templates (channel, sort_order) WHERE is_active = 1;

CREATE INDEX IF NOT EXISTS agent_runs_started_idx ON agent_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS agent_runs_running_idx ON agent_runs (heartbeat_at) WHERE status = 'running';
CREATE UNIQUE INDEX IF NOT EXISTS content_topics_keyword_uidx ON content_topics (lower(keyword));
CREATE INDEX IF NOT EXISTS content_topics_queue_idx ON content_topics (status, priority, created_at);
CREATE INDEX IF NOT EXISTS agent_questions_open_idx ON agent_questions (created_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS agent_questions_undelivered_idx ON agent_questions (answered_at)
  WHERE status = 'answered' AND delivered_run_id IS NULL;
CREATE INDEX IF NOT EXISTS api_idempotency_expires_idx ON api_idempotency (expires_at);
CREATE INDEX IF NOT EXISTS idx_error_counts_hour ON error_counts (hour);

-- =====================================================================
-- Triggers
-- =====================================================================
-- Postgres set_updated_at() is a BEFORE UPDATE trigger that assigns now().
-- SQLite cannot assign NEW, so each table gets an AFTER UPDATE trigger that
-- writes updated_at itself. It fires only when the statement left updated_at
-- as it was (an explicit value wins, as it does in the Postgres trigger's
-- absence of a caller value), and SQLite does not re-run a trigger from its
-- own UPDATE (recursive_triggers is off), so there is no loop.

CREATE TRIGGER IF NOT EXISTS trg_counties_touch AFTER UPDATE ON counties
  WHEN NEW.updated_at IS OLD.updated_at
  BEGIN UPDATE counties SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id; END;
CREATE TRIGGER IF NOT EXISTS trg_cities_touch AFTER UPDATE ON cities
  WHEN NEW.updated_at IS OLD.updated_at
  BEGIN UPDATE cities SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id; END;
CREATE TRIGGER IF NOT EXISTS trg_practice_areas_touch AFTER UPDATE ON practice_areas
  WHEN NEW.updated_at IS OLD.updated_at
  BEGIN UPDATE practice_areas SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id; END;
CREATE TRIGGER IF NOT EXISTS trg_location_pages_touch AFTER UPDATE ON location_pages
  WHEN NEW.updated_at IS OLD.updated_at
  BEGIN UPDATE location_pages SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id; END;
CREATE TRIGGER IF NOT EXISTS trg_blog_posts_touch AFTER UPDATE ON blog_posts
  WHEN NEW.updated_at IS OLD.updated_at
  BEGIN UPDATE blog_posts SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id; END;
CREATE TRIGGER IF NOT EXISTS trg_leads_touch AFTER UPDATE ON leads
  WHEN NEW.updated_at IS OLD.updated_at
  BEGIN UPDATE leads SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id; END;
CREATE TRIGGER IF NOT EXISTS trg_attorney_profiles_touch AFTER UPDATE ON attorney_profiles
  WHEN NEW.updated_at IS OLD.updated_at
  BEGIN UPDATE attorney_profiles SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id; END;
CREATE TRIGGER IF NOT EXISTS trg_legal_pages_touch AFTER UPDATE ON legal_pages
  WHEN NEW.updated_at IS OLD.updated_at
  BEGIN UPDATE legal_pages SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id; END;
CREATE TRIGGER IF NOT EXISTS trg_content_topics_touch AFTER UPDATE ON content_topics
  WHEN NEW.updated_at IS OLD.updated_at
  BEGIN UPDATE content_topics SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id; END;

-- Postgres blog_posts_sync_review_status() keeps review_status in step with
-- is_published (BEFORE insert or update). As AFTER triggers that correct the
-- row: published -> review_status 'published'; unpublished while 'published'
-- -> 'approved'.
CREATE TRIGGER IF NOT EXISTS trg_blog_posts_sync_review_insert AFTER INSERT ON blog_posts
  WHEN NEW.is_published = 1 AND NEW.review_status <> 'published'
  BEGIN UPDATE blog_posts SET review_status = 'published' WHERE id = NEW.id; END;
CREATE TRIGGER IF NOT EXISTS trg_blog_posts_sync_review_publish AFTER UPDATE OF is_published ON blog_posts
  WHEN NEW.is_published = 1 AND OLD.is_published = 0 AND NEW.review_status <> 'published'
  BEGIN UPDATE blog_posts SET review_status = 'published' WHERE id = NEW.id; END;
CREATE TRIGGER IF NOT EXISTS trg_blog_posts_sync_review_unpublish AFTER UPDATE OF is_published ON blog_posts
  WHEN NEW.is_published = 0 AND OLD.is_published = 1 AND NEW.review_status = 'published'
  BEGIN UPDATE blog_posts SET review_status = 'approved' WHERE id = NEW.id; END;

-- =====================================================================
-- Postgres functions NOT recreated here (see the header). The client answers
-- PGRST202 for each until the part that moves it:
--   bump_rate_limit, claim_content_topics, content_health_issues,
--   content_health_issues_unguarded, bump_error_count, error_counts_recent,
--   is_admin, is_owner, is_editor.
-- =====================================================================
