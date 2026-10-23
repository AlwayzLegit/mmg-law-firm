-- 0035: admin_profiles.password_set — record the column the app relies on.
--
-- The flag was added to the live project by hand in June 2026 (commit
-- a3f537e, "migration applied") but never committed, so a fresh database
-- has no column and requireAdmin() fails for every admin. This file makes
-- the schema reproducible. It is idempotent: on the live project (column
-- already present) it is a no-op.
--
-- Semantics: false until the admin chooses a password on /onboarding; while
-- false, requireAdmin() sends them there. Rows that already exist when the
-- column is first created belong to admins who sign in with a password
-- today, so they are backfilled to true rather than forced through
-- onboarding again.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_profiles'
      and column_name = 'password_set'
  ) then
    alter table public.admin_profiles
      add column password_set boolean not null default false;
    update public.admin_profiles set password_set = true;
  end if;
end
$$;

comment on column public.admin_profiles.password_set is
  'False until the admin sets a password on /onboarding (invite accepted). While false, requireAdmin() redirects to /onboarding.';
