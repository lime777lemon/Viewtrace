-- Security (Supabase advisor 0026): public.users が anon に SELECT 可能だと GraphQL スキーマに載り、匿名キーだけで発見可能。
-- anon / PUBLIC から剥ぎ、authenticated + RLS で行単位制御。
--
-- 注意: ここで対象にしているのは auth.users ではなく public.users。
-- public.users の設計（主キーや所有者カラム）が違う場合は、下のポリシー生成ロジックを調整すること。

DO $$
DECLARE
  uid_col text;
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    REVOKE ALL PRIVILEGES ON TABLE public.users FROM anon;
    REVOKE ALL PRIVILEGES ON TABLE public.users FROM PUBLIC;
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    -- ログイン済みだけ見せる（行の許可は RLS ポリシーで制御）
    GRANT SELECT ON TABLE public.users TO authenticated;

    COMMENT ON TABLE public.users IS 'anon/PUBLIC から REVOKE。authenticated のみ GRANT。RLS で行単位制御。';

    -- 典型的な所有者カラムを自動検出（id/user_id/owner_id のどれか）
    SELECT c.column_name INTO uid_col
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'users'
      AND c.column_name IN ('id', 'user_id', 'owner_id')
    ORDER BY CASE c.column_name
      WHEN 'id' THEN 1
      WHEN 'user_id' THEN 2
      ELSE 3
    END
    LIMIT 1;

    IF uid_col IS NULL THEN
      RAISE WARNING 'public.users に id/user_id/owner_id がありません。RLS は有効ですがポリシーが無いと authenticated でも SELECT できません。設計に合わせて手動で SELECT ポリシーを追加してください。';
    ELSE
      EXECUTE 'DROP POLICY IF EXISTS users_select_own ON public.users';
      EXECUTE format(
        'CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated USING (auth.uid() = %I)',
        uid_col
      );
    END IF;
  ELSE
    RAISE NOTICE 'public.users が存在しません。テーブル作成後にこのマイグレーションを再実行してください。';
  END IF;
END $$;

