-- Task list for the admin. Tasks can hang off a lead (follow-up call, send
-- retainer, request police report) or stand alone (firm to-dos). Powers the
-- "Today" agenda. Admin-only, mirroring the other operational tables.

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  -- Null lead_id = a standalone firm task (not tied to a specific lead).
  lead_id uuid references leads(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  assigned_to uuid references auth.users(id),
  done boolean not null default false,
  done_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists tasks_open_due_idx on tasks (due_at) where not done;
create index if not exists tasks_lead_idx on tasks (lead_id);
create index if not exists tasks_assignee_open_idx
  on tasks (assigned_to) where not done;

alter table tasks enable row level security;
drop policy if exists tasks_admin_all on tasks;
create policy tasks_admin_all on tasks
  for all using (is_admin()) with check (is_admin());
