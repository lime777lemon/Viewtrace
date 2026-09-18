-- Phase A: Verify → new user → first observation attribution.
-- Anonymous funnel events. Service role only (no anon/authenticated Data API access).

create table if not exists public.verify_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  verify_token text not null,
  source_observation_id uuid references public.observations (id) on delete set null,
  anonymous_session_id uuid not null,
  user_id uuid references auth.users (id) on delete set null,
  source_user_id uuid references auth.users (id) on delete set null,
  result_observation_id uuid references public.observations (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  constraint verify_events_type_ok check (
    event_type in (
      'verify_view',
      'verify_cta_click',
      'url_submitted',
      'signup_started',
      'signup_completed',
      'first_observation_created'
    )
  ),
  constraint verify_events_token_len check (char_length(verify_token) = 48),
  constraint verify_events_metadata_obj check (jsonb_typeof(metadata) = 'object')
);

comment on table public.verify_events is
  'Verify-page product-loop events. No email/IP/raw URL. Service role only.';

comment on column public.verify_events.verify_token is
  'observations.verify_token of Observation A (source).';

comment on column public.verify_events.source_observation_id is
  'Observation A id resolved server-side from verify_token.';

comment on column public.verify_events.source_user_id is
  'Owner of Observation A. Internal only; never shown on public Verify.';

comment on column public.verify_events.result_observation_id is
  'Observation B created from this loop (first_observation_created).';

comment on column public.verify_events.anonymous_session_id is
  'Cookie-backed anonymous id so pre-signup events can join to user_id later.';

create index if not exists verify_events_token_type_created_idx
  on public.verify_events (verify_token, event_type, created_at desc);

create index if not exists verify_events_session_type_created_idx
  on public.verify_events (anonymous_session_id, event_type, created_at desc);

create index if not exists verify_events_user_created_idx
  on public.verify_events (user_id, created_at desc)
  where user_id is not null;

create index if not exists verify_events_result_obs_idx
  on public.verify_events (result_observation_id)
  where result_observation_id is not null;

alter table public.verify_events enable row level security;

revoke all on table public.verify_events from anon;
revoke all on table public.verify_events from authenticated;
revoke all on table public.verify_events from public;
