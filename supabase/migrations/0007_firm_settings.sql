-- 0007_firm_settings.sql — singleton settings row for firm-level facts
-- the attorney/staff might want to edit without a deploy.
--
-- Scope is intentionally narrow: founding year (footer "Established YYYY")
-- and the firm-level sameAs URLs (yelp, super lawyers — the per-attorney
-- ones moved to attorney_profiles in 0004). Truly technical config (phone,
-- email, address, hours) stays in src/lib/constants.ts: those rarely
-- change and are referenced synchronously from many surfaces.

create table if not exists firm_settings (
  id smallint primary key check (id = 1) default 1,
  founded_year int,
  yelp_url text,
  super_lawyers_url text,
  updated_at timestamptz not null default now()
);

-- Reuse the set_updated_at() trigger function from 0001_init.sql.
drop trigger if exists trg_firm_settings_set_updated_at on firm_settings;
create trigger trg_firm_settings_set_updated_at
  before update on firm_settings
  for each row execute function set_updated_at();

-- =========================================================================
-- RLS — public read (these values are surfaced in JSON-LD and the footer),
-- admin-only writes.
-- =========================================================================

alter table firm_settings enable row level security;

drop policy if exists firm_settings_public_read on firm_settings;
drop policy if exists firm_settings_admin_all on firm_settings;

create policy firm_settings_public_read on firm_settings
  for select using (true);
create policy firm_settings_admin_all on firm_settings
  for all using (is_admin()) with check (is_admin());

-- =========================================================================
-- Seed: mirror the current values in src/lib/constants.ts so behavior is
-- unchanged on first apply. Attorney edits via /admin/settings/firm.
-- =========================================================================

insert into firm_settings (id, founded_year, yelp_url, super_lawyers_url)
values (
  1,
  2018,
  'https://www.yelp.com/biz/mmg-law-firm-glendale',
  'https://profiles.superlawyers.com/california/glendale/lawfirm/mmg-law-firm/68073bd3-6378-44e2-9f67-582e4c41c5d5.html'
)
on conflict (id) do nothing;
