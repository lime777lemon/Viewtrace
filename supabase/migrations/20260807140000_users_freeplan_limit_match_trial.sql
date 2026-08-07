-- public.users.observations_limit の「表示値」を、無料登録者の実効上限に一致させる。
-- 実際に効く無料枠は src/lib/plans.ts の TRIAL_CONFIG.freeObservations = 20回 / 14日間。
-- （users.observations_limit はミラー表示であり、観測回数の判定には使われない）
-- 対応:
--   1) 列デフォルトを 20 に変更（新規は freeplan なので 20 で表示）。
--   2) 既存 freeplan 行の observations_limit を 20 に更新。
--   ※ 有料（starter=80 / pro=250）は Stripe 同期で個別に上書きされるため対象外。
-- 冪等・スキーマ欠落時は安全に no-op。

DO $body$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE NOTICE 'viewtrace: public.users missing — skip freeplan limit match';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='observations_limit'
  ) THEN
    RAISE NOTICE 'viewtrace: public.users.observations_limit missing — skip';
    RETURN;
  END IF;

  ALTER TABLE public.users ALTER COLUMN observations_limit SET DEFAULT 20;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='plan'
  ) THEN
    UPDATE public.users
    SET observations_limit = 20
    WHERE plan = 'freeplan'
      AND observations_limit IS DISTINCT FROM 20;
  END IF;

  RAISE NOTICE 'viewtrace: freeplan observations_limit mirror set to 20';
END
$body$;
