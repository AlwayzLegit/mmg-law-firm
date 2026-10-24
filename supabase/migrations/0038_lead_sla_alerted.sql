-- 0038: speed-to-lead breach alert bookkeeping.
--
-- /api/cron/sla-alerts runs every 15 minutes and alerts the firm once per
-- lead that is still in `new` past the first-response target
-- (src/lib/leads/sla.ts). sla_alerted_at records that the alert went out so
-- the next run does not repeat it; the daily agenda email keeps nagging
-- after that.

alter table public.leads
  add column if not exists sla_alerted_at timestamptz;

comment on column public.leads.sla_alerted_at is
  'When the speed-to-lead breach alert for this lead was sent (null = not yet). See /api/cron/sla-alerts.';

create index if not exists leads_sla_pending_idx
  on public.leads (created_at)
  where status = 'new' and sla_alerted_at is null and merged_into is null;
