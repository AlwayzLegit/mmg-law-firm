-- Lead merge support. When two lead rows are the same person, one is merged
-- into the other: its notes/messages/tasks reattach to the primary and the
-- duplicate is stamped with merged_into so it drops out of active views.

alter table leads add column if not exists merged_into uuid references leads(id);
create index if not exists leads_merged_into_idx on leads (merged_into);
