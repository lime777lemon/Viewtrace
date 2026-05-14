-- Internal ops monitoring: append-only signals + baseline for growth + alert dedupe.
-- Accessed only via SUPABASE_SERVICE_ROLE_KEY (RLS enabled, no policies for anon/authenticated).

create table if not exists public.ops_monitoring_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  signal_type text not null,
  payload jsonb not null default '{}'::jsonb,
  constraint ops_monitoring_events_signal_type_len check (
    char_length(signal_type) >= 1
    and char_length(signal_type) <= 64
  )
);

comment on table public.ops_monitoring_events is 'Ops signals (errors, auth failures, suspicious paths). Service role only.';

create index if not exists ops_monitoring_events_created_idx
  on public.ops_monitoring_events (created_at desc);

create index if not exists ops_monitoring_events_type_created_idx
  on public.ops_monitoring_events (signal_type, created_at desc);

alter table public.ops_monitoring_events enable row level security;

revoke all on table public.ops_monitoring_events from anon;
revoke all on table public.ops_monitoring_events from authenticated;

-- Single-row baseline for DB connection count / DB size / self latency (updated by cron).
create table if not exists public.ops_monitoring_baseline (
  id smallint primary key default 1,
  last_db_connections int,
  last_db_size_bytes bigint,
  last_self_latency_ms int,
  updated_at timestamptz not null default now(),
  constraint ops_monitoring_baseline_singleton check (id = 1)
);

comment on table public.ops_monitoring_baseline is 'Latest sampled metrics for delta alerts. Service role only.';

insert into public.ops_monitoring_baseline (id, last_db_connections, last_db_size_bytes, last_self_latency_ms)
values (1, null, null, null)
on conflict (id) do nothing;

alter table public.ops_monitoring_baseline enable row level security;

revoke all on table public.ops_monitoring_baseline from anon;
revoke all on table public.ops_monitoring_baseline from authenticated;

create table if not exists public.ops_alert_dedupe (
  alert_key text primary key,
  last_sent_at timestamptz not null
);

comment on table public.ops_alert_dedupe is 'Cooldown tracking for ops alert emails. Service role only.';

alter table public.ops_alert_dedupe enable row level security;

revoke all on table public.ops_alert_dedupe from anon;
revoke all on table public.ops_alert_dedupe from authenticated;
