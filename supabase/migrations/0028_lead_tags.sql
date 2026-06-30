-- The leads.tags column was referenced in app code (leads list, tag-control,
-- bulk-tag UI, lead_tags vocabulary helper) but the migration to add it never
-- shipped. /admin/leads errored with "column leads.tags does not exist" until
-- this ran. Default to an empty array so existing rows are well-formed.

alter table leads
  add column if not exists tags text[] not null default '{}';

-- GIN index for the existing `tags @> array[…]` filter used by the leads list.
create index if not exists leads_tags_gin on leads using gin (tags);
