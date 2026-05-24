-- 0011_firm_stats.sql — optional "by the numbers" homepage band.
--
-- All columns are nullable. The public component (HomepageStats) only
-- renders when at least one is populated. Per spec hard rule #6, the
-- attorney fills in real numbers via /admin/settings/firm — nothing is
-- seeded here.
--
-- The data-layer helper `getFirmStats()` is robust to this migration not
-- yet being applied: it selects just these columns; on error (column does
-- not exist) it falls back to an empty result and the band stays hidden.
-- Means the code can ship before the migration is run.
--
-- Idempotent.

alter table firm_settings
  add column if not exists years_practicing int,
  add column if not exists settlements_total_display text,
  add column if not exists cases_handled_display text,
  add column if not exists consultations_display text;

comment on column firm_settings.years_practicing is
  'Whole years of practice. Surfaced as "{n}+ Years Practicing".';
comment on column firm_settings.settlements_total_display is
  'Free-form display string — e.g. "$10M+ Recovered". Attorney verifies.';
comment on column firm_settings.cases_handled_display is
  'Free-form display string — e.g. "200+ Cases Handled". Attorney verifies.';
comment on column firm_settings.consultations_display is
  'Free-form display string — e.g. "Free Consultations" or "24/7 Intake".';
