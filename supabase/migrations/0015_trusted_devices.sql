-- 0015_trusted_devices.sql
-- Device-trust second factor for admin login.
--
-- Admin auth is password-primary (Supabase email+password). On a device that
-- has not been verified, login requires a one-time 6-digit email code (or the
-- emailed magic link). A verified device is remembered for 30 days so the
-- second factor is not demanded on every sign-in.
--
-- The browser holds an opaque random token in an httpOnly cookie (`mmg_device`).
-- We never store that token; we store only its SHA-256 hash here, scoped to the
-- user. A device counts as "trusted" for a user when a non-expired row matches
-- (user_id, device_hash). All access is via the service-role client in server
-- actions / the auth callback — there are deliberately no RLS policies, so the
-- anon and authenticated roles cannot read or write this table.

create table if not exists public.trusted_devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  device_hash  text not null,
  label        text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  unique (user_id, device_hash)
);

alter table public.trusted_devices enable row level security;
-- No policies: only the service role (which bypasses RLS) may touch this table.

create index if not exists trusted_devices_user_id_idx
  on public.trusted_devices (user_id);
create index if not exists trusted_devices_expires_at_idx
  on public.trusted_devices (expires_at);

comment on table public.trusted_devices is
  'Remembered admin devices for the login second factor. Service-role access only.';
