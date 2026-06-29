-- Lead communications: outbound + inbound SMS/email logged per lead.
-- Outbound messages are sent by admins (Twilio REST / Resend) and logged here;
-- inbound replies arrive via the Twilio webhook and are inserted with the
-- service-role key (bypassing RLS). Admin-only read/write, mirroring lead_notes.

create table if not exists lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  channel text not null check (channel in ('sms', 'email')),
  direction text not null check (direction in ('outbound', 'inbound')),
  -- author_id is the admin who sent an outbound message; null for inbound.
  author_id uuid references auth.users(id),
  subject text,
  body text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'failed', 'received')),
  -- Provider message id (Twilio SID / Resend id) for correlation.
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists lead_messages_lead_idx
  on lead_messages (lead_id, created_at desc);
create index if not exists lead_messages_provider_idx
  on lead_messages (provider_id);

alter table lead_messages enable row level security;
drop policy if exists lead_messages_admin_all on lead_messages;
create policy lead_messages_admin_all on lead_messages
  for all using (is_admin()) with check (is_admin());
