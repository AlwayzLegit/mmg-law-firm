-- 0020_lead_saved_views.sql
-- Per-admin saved filter presets for the leads list. Each admin owns their
-- own views; the stored `query` is the leads-list querystring (e.g.
-- "status=new&assignee=unassigned"). Access is via the authenticated admin
-- session, so RLS scopes rows to the owner.

create table if not exists public.lead_saved_views (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  query      text not null default '',
  created_at timestamptz not null default now()
);

alter table public.lead_saved_views enable row level security;

-- An admin may read and manage only their own saved views.
drop policy if exists lead_saved_views_owner on public.lead_saved_views;
create policy lead_saved_views_owner on public.lead_saved_views
  for all
  using (is_admin() and owner_id = auth.uid())
  with check (is_admin() and owner_id = auth.uid());

create index if not exists lead_saved_views_owner_idx
  on public.lead_saved_views (owner_id, created_at desc);

comment on table public.lead_saved_views is
  'Per-admin saved filter presets for the leads list (owner-scoped via RLS).';
