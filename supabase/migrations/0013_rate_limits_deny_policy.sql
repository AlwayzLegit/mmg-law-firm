-- 0013_rate_limits_deny_policy.sql — make the deny-by-default intent
-- on rate_limits explicit.
--
-- 0012 enabled RLS on rate_limits but didn't create any policies. PostgREST
-- denies everything by default in that state, which is what we want — only
-- the service-role client (via the `bump_rate_limit()` SECURITY DEFINER
-- RPC) should ever read or write it. Supabase's linter still flags the
-- "RLS on with no policy" state as an info-level warning though, so this
-- adds a permanent-false policy that documents the intent and quiets the
-- advisor without changing behavior.

drop policy if exists rate_limits_deny_all on rate_limits;
create policy rate_limits_deny_all on rate_limits
  for all using (false) with check (false);
