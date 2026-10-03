-- Badges & press logos shown in the homepage "Results & reviews" block.
-- Optional: an empty array hides the panel. Each entry is
-- { "src": "<media object name or absolute URL>", "alt": "<label>", "href"?: "<url>" }.
alter table public.firm_settings
  add column if not exists badges_json jsonb not null default '[]'::jsonb;

comment on column public.firm_settings.badges_json is
  'Award badges / press logos for the homepage trust block: [{src, alt, href?}]. Empty hides the panel.';
