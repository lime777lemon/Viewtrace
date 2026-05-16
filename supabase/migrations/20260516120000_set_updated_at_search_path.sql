-- Supabase advisor 0011 (function_search_path_mutable):
-- "Function public.set_updated_at has a role mutable search_path"
--
-- 既存の public.set_updated_at は SET search_path が未設定のため、ロール側で
-- search_path を差し替えられると timezone/now を別の関数で覆える余地がある。
-- search_path を空に固定し、組み込み関数は pg_catalog を明示的に修飾する。
--
-- トリガー（例: public.observation_watches.set_observation_watches_updated_at）は
-- 関数 OID 参照なので、CREATE OR REPLACE すれば張り替え不要。

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.timezone('utc', pg_catalog.now());
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE トリガー用ヘルパー: updated_at を UTC now() に揃える。search_path を固定（Supabase advisor 0011 対応）。';
