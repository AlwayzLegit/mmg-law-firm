-- 0036: first-touch landing page on leads.
--
-- source_url is the page the form was submitted from (usually /contact).
-- landing_url is the first page of the visit that produced the lead, kept
-- client-side for 30 days with the campaign parameters and external
-- referrer, so attribution survives a visitor reading a guide and then
-- navigating to the contact page.

alter table public.leads
  add column if not exists landing_url text;

comment on column public.leads.landing_url is
  'First page of the visit that produced this lead (first-touch). source_url is the page the form was submitted from.';
