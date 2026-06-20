-- Admin-managed URL redirects, enforced in src/proxy.ts.
-- Public-read so the proxy can fetch them with the anon key; writes are
-- admin-only via is_admin().

create table if not exists redirects (
  id uuid primary key default gen_random_uuid(),
  source_path text not null unique,
  destination text not null,
  permanent boolean not null default true,
  created_at timestamptz not null default now()
);

alter table redirects enable row level security;

drop policy if exists "redirects public read" on redirects;
create policy "redirects public read" on redirects for select using (true);

drop policy if exists "redirects admin write" on redirects;
create policy "redirects admin write" on redirects
  for all using (is_admin()) with check (is_admin());

comment on table redirects is 'Admin-managed URL redirects enforced in proxy.ts.';
