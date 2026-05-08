-- ユーザー単位の追記専用監査ログ（観測・CSV・認証など）。
-- chain_hash は直前イベントとの連鎖により、記録の整合性確認の補助になる（完全な WORM や第三者証明ではない）。

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  resource_type text,
  resource_id text,
  meta jsonb not null default '{}'::jsonb,
  chain_hash text not null,
  created_at timestamptz not null default now(),
  constraint audit_events_action_len check (
    char_length(action) >= 1
    and char_length(action) <= 120
  ),
  constraint audit_events_resource_type_len check (
    resource_type is null
    or char_length(resource_type) <= 80
  ),
  constraint audit_events_resource_id_len check (
    resource_id is null
    or char_length(resource_id) <= 200
  ),
  constraint audit_events_chain_hash_len check (char_length(chain_hash) = 64)
);

create index if not exists audit_events_user_created_idx
  on public.audit_events (user_id, created_at desc);

comment on table public.audit_events is '追記専用の監査イベント。authenticated のみ SELECT/INSERT（本人行のみ）。';

alter table public.audit_events enable row level security;

revoke all on table public.audit_events from anon;
revoke all on table public.audit_events from public;
grant select, insert on table public.audit_events to authenticated;

drop policy if exists audit_events_select_own on public.audit_events;
create policy audit_events_select_own on public.audit_events
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists audit_events_insert_own on public.audit_events;
create policy audit_events_insert_own on public.audit_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);
