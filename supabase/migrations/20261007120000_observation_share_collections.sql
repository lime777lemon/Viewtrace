-- Share Collection: one unguessable link over existing Observations.
-- Does not create Observations. Public read is token-gated in app (service role).

create table if not exists public.observation_share_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now(),
  constraint observation_share_collections_token_len check (char_length(token) = 48)
);

comment on table public.observation_share_collections is
  'Public share of existing Observations. Token is unguessable hex. Not an Observation.';

comment on column public.observation_share_collections.token is
  'Public /share/{token} (hex). Not hashed in observation content_hash.';

create unique index if not exists observation_share_collections_token_unique
  on public.observation_share_collections (token);

create index if not exists observation_share_collections_user_created_idx
  on public.observation_share_collections (user_id, created_at desc);

create table if not exists public.observation_share_collection_items (
  collection_id uuid not null references public.observation_share_collections (id) on delete cascade,
  observation_id uuid not null references public.observations (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, observation_id)
);

comment on table public.observation_share_collection_items is
  'Existing Observation ids in a share collection. No extra capture.';

create index if not exists observation_share_collection_items_obs_idx
  on public.observation_share_collection_items (observation_id);

alter table public.observation_share_collections enable row level security;
alter table public.observation_share_collection_items enable row level security;

revoke all on table public.observation_share_collections from anon;
revoke all on table public.observation_share_collections from public;
revoke all on table public.observation_share_collection_items from anon;
revoke all on table public.observation_share_collection_items from public;

grant select, insert, delete on table public.observation_share_collections to authenticated;
grant select, insert, delete on table public.observation_share_collection_items to authenticated;

drop policy if exists observation_share_collections_select_own on public.observation_share_collections;
drop policy if exists observation_share_collections_insert_own on public.observation_share_collections;
drop policy if exists observation_share_collections_delete_own on public.observation_share_collections;
drop policy if exists observation_share_collection_items_select_own on public.observation_share_collection_items;
drop policy if exists observation_share_collection_items_insert_own on public.observation_share_collection_items;
drop policy if exists observation_share_collection_items_delete_own on public.observation_share_collection_items;

create policy observation_share_collections_select_own
  on public.observation_share_collections for select to authenticated
  using (auth.uid() = user_id);

create policy observation_share_collections_insert_own
  on public.observation_share_collections for insert to authenticated
  with check (auth.uid() = user_id);

create policy observation_share_collections_delete_own
  on public.observation_share_collections for delete to authenticated
  using (auth.uid() = user_id);

create policy observation_share_collection_items_select_own
  on public.observation_share_collection_items for select to authenticated
  using (
    exists (
      select 1
      from public.observation_share_collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

create policy observation_share_collection_items_insert_own
  on public.observation_share_collection_items for insert to authenticated
  with check (
    exists (
      select 1
      from public.observation_share_collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.observations o
      where o.id = observation_id and o.user_id = auth.uid()
    )
  );

create policy observation_share_collection_items_delete_own
  on public.observation_share_collection_items for delete to authenticated
  using (
    exists (
      select 1
      from public.observation_share_collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );
