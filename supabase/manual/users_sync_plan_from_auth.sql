-- public.users の plan / observations_limit を auth.users のメタデータに合わせる（一括修復用）
-- Supabase SQL Editor で実行。auth スキーマへの参照権限が必要です。
--
-- アプリの正: user_metadata->plan と src/lib/plans.ts（starter 80 / pro 250 / freeplan 80）

UPDATE public.users pu
SET
  plan = COALESCE(NULLIF(btrim(au.raw_user_meta_data->>'plan'), ''), 'freeplan'),
  observations_limit = CASE COALESCE(NULLIF(btrim(au.raw_user_meta_data->>'plan'), ''), 'freeplan')
    WHEN 'pro' THEN 250
    WHEN 'starter' THEN 80
    WHEN 'freeplan' THEN 80
    ELSE 80
  END
FROM auth.users au
WHERE au.id = pu.id;

-- 上記後、Table Editor で auth の plan と public.users が一致するか確認してください。
