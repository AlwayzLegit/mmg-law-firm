-- 0037: intake checklist on leads.
--
-- A small jsonb of booleans the intake desk ticks during the first call
-- (public entity involved, medical treatment, police report, insurance
-- info, evidence, retainer). Kept as jsonb so items can be added without
-- a migration; the keys are defined in src/lib/leads/limitations.ts.
-- `government_entity` also switches the statute-of-limitations estimate to
-- the 6-month public-entity claim.

alter table public.leads
  add column if not exists intake jsonb not null default '{}'::jsonb;

comment on column public.leads.intake is
  'Intake checklist booleans (see src/lib/leads/limitations.ts INTAKE_ITEMS).';
