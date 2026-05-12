-- 0010_restore_is_admin_execute.sql — undo the EXECUTE revocation from 0009.
--
-- Migration 0009 revoked EXECUTE on is_admin() from anon and authenticated
-- to address an advisor warning about an exposed SECURITY DEFINER function.
-- Unintended consequence: every public table has both a public_read policy
-- AND an admin_all policy that calls is_admin(). PostgREST evaluates BOTH
-- policies for every SELECT (logical OR), and Postgres requires permission
-- to even evaluate the expression — so anon SELECTs error with
-- "permission denied for function is_admin" on every table whose
-- public_read policy isn't simply `using (true)`. firm_settings happens to
-- work because its public_read uses `using (true)` and short-circuits the
-- OR, masking the bug until production logs surfaced it.
--
-- Restore EXECUTE so the public site works again. The advisor warning is
-- accepted as low-risk: calling is_admin() as anon just returns false and
-- exposes no data. A cleaner long-term fix is to move is_admin() to a
-- non-exposed schema (e.g. `private`); for now we keep it in public.
--
-- Idempotent.

grant execute on function public.is_admin() to anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;
