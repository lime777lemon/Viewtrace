-- 無料登録者を public.users 上で明確に "freeplan" と表記する。
-- 背景:
--   - Auth（真実のソース）ではサインアップ時に user_metadata.plan='freeplan' を付与している。
--   - しかし public.users は列デフォルトが plan='starter' / observations_limit=50 のため、
--     未課金の無料登録者が Table Editor 上で有料 Starter と区別できなかった。
--   - handle_auth_user_created() は plan/observations_limit を設定しないため、列デフォルトが効く。
-- 対応:
--   1) 列デフォルトを freeplan / 80（src/lib/plans.ts の freeplan.monthlyObservations）に変更。
--   2) 既存の無料登録者（Auth が freeplan かつ Stripe サブスク無し）を freeplan / 80 にバックフィル。
--   ※ 有料（starter/pro・Stripe サブスクあり）は対象外。
-- 冪等・スキーマ欠落時は安全に no-op。

DO $body$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE NOTICE 'viewtrace: public.users missing — skip freeplan default migration';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='plan'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN plan SET DEFAULT 'freeplan';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='observations_limit'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN observations_limit SET DEFAULT 80;
  END IF;

  -- 既存の無料登録者をバックフィル（Auth を真実のソースとする）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='plan'
  ) THEN
    UPDATE public.users u
    SET plan = 'freeplan',
        observations_limit = 80
    FROM auth.users au
    WHERE au.id = u.id
      AND coalesce(au.raw_user_meta_data->>'plan', 'freeplan') = 'freeplan'
      AND (au.raw_user_meta_data->>'stripe_subscription_id') IS NULL
      AND u.plan IS DISTINCT FROM 'freeplan';
  END IF;

  RAISE NOTICE 'viewtrace: public.users default set to freeplan and free users backfilled';
END
$body$;
