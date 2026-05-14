-- Table Editor / SQL Editor 用: public.users の observations_limit をプランに合わせる
-- アプリの正: src/lib/plans.ts — starter 80 / pro 250 / freeplan 80
--
-- 前提: public.users に text の plan 列（'starter' | 'pro' | 'freeplan'）があること。
-- 列名が違う場合は plan / observations_limit を読み替えてください。

UPDATE public.users
SET observations_limit = CASE lower(btrim(plan))
  WHEN 'pro' THEN 250
  WHEN 'starter' THEN 80
  WHEN 'freeplan' THEN 80
  ELSE 80
END;

-- 新規行のデフォルトが 50 のままなら、デフォルトも直す例（カラムが存在するときのみ実行）:
-- ALTER TABLE public.users ALTER COLUMN observations_limit SET DEFAULT 80;
