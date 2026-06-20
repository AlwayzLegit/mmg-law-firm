-- Lead follow-up reminders.
-- A single nullable timestamp on the lead is enough to drive a "follow-ups
-- due" queue without a separate tasks table. When set and in the past (and
-- the lead is still open), the lead surfaces in the due list.

alter table leads
  add column if not exists follow_up_at timestamptz;

-- Partial index: we only ever query rows that have a follow-up scheduled.
create index if not exists leads_follow_up_at_idx
  on leads (follow_up_at)
  where follow_up_at is not null;

comment on column leads.follow_up_at is
  'Optional reminder timestamp. Drives the admin "follow-ups due" queue.';
