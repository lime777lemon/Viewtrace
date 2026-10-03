-- Node registry for pull-based geo nodes. Not wired to production Observations.
-- Apply in SQL editor when promoting Tokyo Node to a Geo Node Network.

create table if not exists public.geo_nodes (
  id uuid primary key default gen_random_uuid(),
  node_id text not null unique,
  country text not null,
  region text,
  city text,
  ip_type text not null default 'residential' check (ip_type in ('residential', 'datacenter')),
  status text not null default 'online' check (status in ('online', 'offline', 'disabled')),
  last_seen_at timestamptz,
  observed_ip text,
  observed_country text,
  observed_region text,
  created_at timestamptz not null default now()
);

create index if not exists geo_nodes_country_region_idx
  on public.geo_nodes (country, region, status);

alter table public.geo_nodes enable row level security;
revoke all on table public.geo_nodes from public, anon, authenticated;
comment on table public.geo_nodes is
  'Declared node location + last verified egress. Observed region is never copied from self-report.';

alter table public.geo_node_jobs
  add column if not exists requested_region text;

alter table public.geo_node_jobs
  add column if not exists observed_region text;
