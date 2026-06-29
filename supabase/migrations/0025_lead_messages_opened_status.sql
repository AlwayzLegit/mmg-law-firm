-- Allow an 'opened' status on lead_messages so the Resend webhook can record
-- when a lead opens an email (a stronger engagement signal than 'delivered').

alter table lead_messages drop constraint if exists lead_messages_status_check;
alter table lead_messages add constraint lead_messages_status_check
  check (status in ('queued', 'sent', 'delivered', 'failed', 'received', 'opened'));
