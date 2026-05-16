-- Supabase advisor hardening:
--   0008 rls_enabled_no_policy        (ops_*, stripe_webhook_events)
--   0026 pg_graphql_anon_table_exposed (stripe_webhook_events)
--   0027 pg_graphql_authenticated_table_exposed (stripe_webhook_events, users)
--   0028 anon_security_definer_function_executable        (update_updated_at_column)
--   0029 authenticated_security_definer_function_executable (update_updated_at_column)
--
-- audit_events / observation_watches / observations / subscriptions の
-- pg_graphql_authenticated_table_exposed は、SSR でログイン中ユーザーが
-- 自身の行を読むのに使うため意図的に GRANT を残す（アプリ依存）。

-- ---------------------------------------------------------------------------
-- 1) public.update_updated_at_column(): SECURITY INVOKER + EXECUTE REVOKE
-- ---------------------------------------------------------------------------
-- 既存はトリガー専用にも関わらず SECURITY DEFINER で `/rest/v1/rpc/...` から
-- anon/authenticated でも呼べる状態。トリガー実行は EXECUTE 権限とは無関係に
-- 動作するため、SECURITY INVOKER に変えて anon/authenticated/PUBLIC から
-- EXECUTE を REVOKE しても既存のトリガーは動き続ける。
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.timezone('utc'::text, pg_catalog.now());
  return new;
end;
$$;

revoke execute on function public.update_updated_at_column() from anon;
revoke execute on function public.update_updated_at_column() from authenticated;
revoke execute on function public.update_updated_at_column() from public;

comment on function public.update_updated_at_column() is
  'BEFORE UPDATE trigger helper (SECURITY INVOKER). EXECUTE revoked from anon/authenticated/PUBLIC (advisor 0028/0029).';

-- ---------------------------------------------------------------------------
-- 2) public.stripe_webhook_events: service_role 専用に限定
-- ---------------------------------------------------------------------------
-- アプリでは src/app/api/stripe/webhook/route.ts の admin（service_role）
-- だけが INSERT する。anon/authenticated は不要。GRANT を REVOKE し、
-- 明示的な deny-all ポリシーも追加して RLS 警告 0008 を解消。
revoke all privileges on table public.stripe_webhook_events from anon;
revoke all privileges on table public.stripe_webhook_events from authenticated;
revoke all privileges on table public.stripe_webhook_events from public;
alter table public.stripe_webhook_events enable row level security;
drop policy if exists stripe_webhook_events_deny_all on public.stripe_webhook_events;
create policy stripe_webhook_events_deny_all
  on public.stripe_webhook_events for all
  to anon, authenticated
  using (false) with check (false);

comment on table public.stripe_webhook_events is
  'Processed Stripe webhook event IDs. service_role only (anon/authenticated REVOKE + deny-all RLS).';

-- ---------------------------------------------------------------------------
-- 3) public.users: service_role 専用に限定
-- ---------------------------------------------------------------------------
-- アプリでは src/lib/supabase/sync-public-user-plan.ts の admin
-- （service_role）だけが UPDATE/INSERT する。authenticated 経由のクエリは無い。
-- 既存の users_select_own ポリシーは将来の再 GRANT 時に備えて残す。
revoke all privileges on table public.users from anon;
revoke all privileges on table public.users from authenticated;
revoke all privileges on table public.users from public;

comment on table public.users is
  'Plan mirror for Table Editor / service_role only (anon/authenticated REVOKE; advisor 0027).';

-- ---------------------------------------------------------------------------
-- 4) ops_* に deny-all ポリシー（advisor 0008 INFO を解消）
-- ---------------------------------------------------------------------------
-- いずれも service_role のみ書き込み（RLS をバイパス）。anon/authenticated は
-- 既に GRANT 無し。明示的な deny-all ポリシーを足して RLS 設定の意図を表す。
do $$
declare t text;
begin
  foreach t in array array['ops_alert_dedupe','ops_monitoring_baseline','ops_monitoring_events']
  loop
    execute format('drop policy if exists %I_deny_all on public.%I', t, t);
    execute format(
      'create policy %I_deny_all on public.%I for all to anon, authenticated using (false) with check (false)',
      t, t
    );
  end loop;
end $$;
