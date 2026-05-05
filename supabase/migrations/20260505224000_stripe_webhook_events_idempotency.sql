-- Stripe webhook idempotency: store processed event IDs.
-- Webhooks can be delivered more than once; this table prevents double processing.

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

comment on table public.stripe_webhook_events is 'Processed Stripe webhook event IDs for idempotency.';

