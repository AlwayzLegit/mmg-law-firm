-- 0021_lead_note_pin_edit.sql
-- Pinning + edit tracking for lead notes. Pinned notes sort to the top of a
-- lead's note list; updated_at records the last edit (null = never edited).

alter table public.lead_notes
  add column if not exists is_pinned boolean not null default false;

alter table public.lead_notes
  add column if not exists updated_at timestamptz;

create index if not exists lead_notes_lead_pinned_idx
  on public.lead_notes (lead_id, is_pinned desc, created_at desc);
