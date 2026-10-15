-- 0034: admin login is email + password only.
--
-- The device-trust second factor (0015) is retired: no more one-time email
-- codes or magic links on sign-in. Invites and password resets are the only
-- auth emails, both generated server-side and sent through Resend. The table
-- held only hashed device tokens, so dropping it loses nothing a user can see.

drop table if exists public.trusted_devices;
