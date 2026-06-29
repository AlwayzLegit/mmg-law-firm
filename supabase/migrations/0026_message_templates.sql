-- Admin-managed message templates for the lead Communications hub. Replaces the
-- hard-coded starter set so the firm can write/edit its own canned SMS + email
-- replies. {{first}} is interpolated with the lead's first name at send time.

create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  channel text not null check (channel in ('sms', 'email')),
  subject text,
  body text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists message_templates_active_idx
  on message_templates (channel, sort_order) where is_active;

alter table message_templates enable row level security;
drop policy if exists message_templates_admin_all on message_templates;
create policy message_templates_admin_all on message_templates
  for all using (is_admin()) with check (is_admin());

-- Seed with the previous in-code starter templates (firm facts resolved).
insert into message_templates (label, channel, subject, body, sort_order)
values
  ('SMS · First contact', 'sms', null,
   'Hi {{first}}, this is MMG Law Firm. Thanks for reaching out about your case — when''s a good time for a quick call? You can also reach us at (818) 539-7969.',
   10),
  ('SMS · Follow-up', 'sms', null,
   'Hi {{first}}, following up on your inquiry with MMG Law Firm. We''d still like to hear what happened and see how we can help. Reply here or call (818) 539-7969.',
   20),
  ('SMS · Schedule a call', 'sms', null,
   'Hi {{first}}, MMG Law Firm here. Are you available for a brief call today or tomorrow? Let us know a time that works and we''ll call you.',
   30),
  ('Email · First contact', 'email', 'Your inquiry with MMG Law Firm',
   E'Hi {{first}},\n\nThank you for reaching out to MMG Law Firm. We received your message and would like to learn more about what happened so we can explain your options.\n\nWhat''s the best phone number and time to reach you for a free, no-obligation consultation? You can also call us directly at (818) 539-7969.\n\nWe look forward to speaking with you.\n\nMihran M. Ghazaryan\nMMG Law Firm\n(818) 539-7969',
   40),
  ('Email · Follow-up', 'email', 'Following up on your inquiry — MMG Law Firm',
   E'Hi {{first}},\n\nI wanted to follow up on the inquiry you submitted to MMG Law Firm. We''re still glad to help and would like to hear more about your situation.\n\nIf you have a few minutes, reply to this email or call us at (818) 539-7969 and we''ll find a time that works for you.\n\nMihran M. Ghazaryan\nMMG Law Firm\n(818) 539-7969',
   50);
