-- 0008_homepage_faqs.sql — homepage cross-practice-area FAQs editable
-- alongside the rest of firm_settings. (Per-practice-area FAQs already live
-- on practice_areas.faq_json; this is the homepage block.)
--
-- Stored as jsonb on firm_settings rather than a new row-per-FAQ table —
-- it's a small, ordered list managed in one place, so the simpler shape
-- pays off in admin UX and migration overhead.
--
-- Left empty per spec hard rules #6/#7 — the in-code fallback in
-- src/lib/data/faqs.ts continues to render until the attorney reviews and
-- saves a curated list via /admin/settings/firm.

alter table firm_settings
  add column if not exists homepage_faqs_json jsonb not null default '[]'::jsonb;
