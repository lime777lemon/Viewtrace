-- Security (Supabase advisor 0026): public.subscriptions が anon に SELECT 可能だと GraphQL で匿名キーから発見可能。
-- anon / PUBLIC から剥ぎ、authenticated + RLS で行単位制御。

DO $$
DECLARE
  uid_col text;
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    REVOKE ALL PRIVILEGES ON TABLE public.subscriptions FROM anon;
    REVOKE ALL PRIVILEGES ON TABLE public.subscriptions FROM PUBLIC;
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscriptions TO authenticated;

    COMMENT ON TABLE public.subscriptions IS 'anon/PUBLIC から REVOKE。authenticated のみ GRANT。RLS で行単位制御。';

    SELECT c.column_name INTO uid_col
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'subscriptions'
      AND c.column_name IN ('user_id', 'owner_id')
    ORDER BY CASE c.column_name WHEN 'user_id' THEN 1 ELSE 2 END
    LIMIT 1;

    IF uid_col IS NULL THEN
      RAISE WARNING 'public.subscriptions に user_id / owner_id がありません。RLS は有効ですがポリシーが無いため authenticated は行にアクセスできません。カラムに合わせてポリシーを手動追加してください。';
    ELSE
      EXECUTE 'DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions';
      EXECUTE 'DROP POLICY IF EXISTS subscriptions_insert_own ON public.subscriptions';
      EXECUTE 'DROP POLICY IF EXISTS subscriptions_update_own ON public.subscriptions';
      EXECUTE 'DROP POLICY IF EXISTS subscriptions_delete_own ON public.subscriptions';

      EXECUTE format(
        'CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = %I)',
        uid_col
      );
      EXECUTE format(
        'CREATE POLICY subscriptions_insert_own ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = %I)',
        uid_col
      );
      EXECUTE format(
        'CREATE POLICY subscriptions_update_own ON public.subscriptions FOR UPDATE TO authenticated USING (auth.uid() = %I) WITH CHECK (auth.uid() = %I)',
        uid_col,
        uid_col
      );
      EXECUTE format(
        'CREATE POLICY subscriptions_delete_own ON public.subscriptions FOR DELETE TO authenticated USING (auth.uid() = %I)',
        uid_col
      );
    END IF;
  ELSE
    RAISE NOTICE 'public.subscriptions が存在しません。テーブル作成後にこのマイグレーションを再実行してください。';
  END IF;
END $$;
