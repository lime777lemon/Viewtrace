-- テーブル存在確認クエリ
-- Supabase SQL Editorで実行してください

-- 1. テーブルが存在するか確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'observations', 'subscriptions');

-- 2. ユーザー数とプロファイル数を確認
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as profile_users_count;

-- 3. プロファイルがない認証ユーザーを確認
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.email_confirmed_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 4. すべてのユーザープロファイルを確認（RLS無視）
-- 注意: このクエリはService Role Keyで実行するか、RLSを一時的に無効化する必要があります
SELECT * FROM public.users;

-- 5. RLSポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('users', 'observations', 'subscriptions');

