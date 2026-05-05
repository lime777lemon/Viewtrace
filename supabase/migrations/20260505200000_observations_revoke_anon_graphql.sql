-- Security (Supabase advisor 0026): anon が SELECT 可能だと GraphQL スキーマに載り、匿名キーだけでテーブルが発見可能。
-- PUBLIC への付与が残っていると anon も引き続きアクセスしうるため、anon / PUBLIC から剥がす。
-- authenticated には GRANT + RLS で行単位制御（advisor 0027 は「ログイン済みがスキーマ上で見える」旨の別チェック。RLS でデータを縛るのが通常）。

DO $$
DECLARE
  uid_col text;
BEGIN
  IF to_regclass('public.observations') IS NOT NULL THEN
    REVOKE ALL PRIVILEGES ON TABLE public.observations FROM anon;
    REVOKE ALL PRIVILEGES ON TABLE public.observations FROM PUBLIC;
    ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.observations TO authenticated;

    COMMENT ON TABLE public.observations IS 'anon/PUBLIC から REVOKE。authenticated のみ GRANT。RLS で行単位制御。';

    SELECT c.column_name INTO uid_col
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'observations'
      AND c.column_name IN ('user_id', 'owner_id')
    ORDER BY CASE c.column_name WHEN 'user_id' THEN 1 ELSE 2 END
    LIMIT 1;

    IF uid_col IS NULL THEN
      RAISE WARNING 'public.observations に user_id / owner_id がありません。RLS は有効ですがポリシーが無いため authenticated は行にアクセスできません。カラムに合わせてポリシーを手動追加してください。';
    ELSE
      EXECUTE 'DROP POLICY IF EXISTS observations_select_own ON public.observations';
      EXECUTE 'DROP POLICY IF EXISTS observations_insert_own ON public.observations';
      EXECUTE 'DROP POLICY IF EXISTS observations_update_own ON public.observations';
      EXECUTE 'DROP POLICY IF EXISTS observations_delete_own ON public.observations';

      EXECUTE format(
        'CREATE POLICY observations_select_own ON public.observations FOR SELECT TO authenticated USING (auth.uid() = %I)',
        uid_col
      );
      EXECUTE format(
        'CREATE POLICY observations_insert_own ON public.observations FOR INSERT TO authenticated WITH CHECK (auth.uid() = %I)',
        uid_col
      );
      EXECUTE format(
        'CREATE POLICY observations_update_own ON public.observations FOR UPDATE TO authenticated USING (auth.uid() = %I) WITH CHECK (auth.uid() = %I)',
        uid_col,
        uid_col
      );
      EXECUTE format(
        'CREATE POLICY observations_delete_own ON public.observations FOR DELETE TO authenticated USING (auth.uid() = %I)',
        uid_col
      );
    END IF;
  ELSE
    RAISE NOTICE 'public.observations が存在しません。テーブル作成後にこのマイグレーションを再実行してください。';
  END IF;
END $$;
