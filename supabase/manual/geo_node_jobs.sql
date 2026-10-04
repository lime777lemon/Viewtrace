-- PoC queue for pull-based geo nodes. Not wired to production Observations.
-- Apply in SQL editor only when running the Tokyo node poll test.

create table if not exists public.geo_node_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'queued' check (status in ('queued', 'claimed', 'done', 'error')),
  node_id text,
  claimed_by text,
  url text not null,
  full_page boolean not null default false,
  requested_country text,
  observed_country text,
  ip_type text,
  ip text,
  http_status integer,
  final_url text,
  duration_ms integer,
  error_code text,
  screenshot_url text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz
);

create index if not exists geo_node_jobs_status_created_idx
  on public.geo_node_jobs (status, created_at);

alter table public.geo_node_jobs enable row level security;

revoke all on table public.geo_node_jobs from public, anon, authenticated;

comment on table public.geo_node_jobs is
  'Pull-based geo node PoC queue. Service role only. Not wired to production Observations.';
