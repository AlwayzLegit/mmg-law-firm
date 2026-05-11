-- 0006_legal_pages.sql — DB-backed legal pages.
--
-- Replaces the hardcoded body in src/app/(marketing)/legal/{privacy,ccpa,
-- disclaimer,accessibility}/page.tsx with rows the attorney can edit
-- through /admin/content/legal/[id]. The TSX routes become thin wrappers
-- that read by slug; until a row is published, the public page renders the
-- in-code fallback in src/lib/data/legal-pages.ts.
--
-- Spec §10.4: legal pages must be reviewed within 12 months — that's why
-- `last_reviewed_at` is required to publish.

create table if not exists legal_pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  body_md text not null,
  meta_description text,
  effective_date date,
  last_reviewed_at timestamptz,
  display_order int not null default 100,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_legal_pages_slug on legal_pages (slug);
create index if not exists idx_legal_pages_published
  on legal_pages (is_published) where is_published = true;

-- Reuse the set_updated_at() trigger from 0001_init.sql.
drop trigger if exists trg_legal_pages_set_updated_at on legal_pages;
create trigger trg_legal_pages_set_updated_at
  before update on legal_pages
  for each row execute function set_updated_at();

-- =========================================================================
-- RLS — public read when published, admin all.
-- =========================================================================

alter table legal_pages enable row level security;

drop policy if exists legal_pages_public_read on legal_pages;
drop policy if exists legal_pages_admin_all on legal_pages;

create policy legal_pages_public_read on legal_pages
  for select using (is_published);
create policy legal_pages_admin_all on legal_pages
  for all using (is_admin()) with check (is_admin());

-- =========================================================================
-- Seed: the 4 canonical legal pages with structural fields only. Body is
-- left empty so the public page falls through to the in-code fallback
-- until the attorney edits and publishes (per spec hard rules #6/#7 — no
-- AI-generated legal copy gets the "attorney-reviewed" stamp without
-- attorney action).
-- =========================================================================

insert into legal_pages (slug, title, subtitle, body_md, display_order, is_published)
values
  (
    'privacy',
    'Privacy Policy',
    null,
    '',
    10,
    false
  ),
  (
    'disclaimer',
    'Legal Disclaimer',
    null,
    '',
    20,
    false
  ),
  (
    'ccpa',
    'Your California Privacy Rights',
    'Notice under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA).',
    '',
    30,
    false
  ),
  (
    'accessibility',
    'Accessibility Statement',
    null,
    '',
    40,
    false
  )
on conflict (slug) do nothing;
