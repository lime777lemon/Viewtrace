-- 開発環境用: RLSを一時的に無効化
-- ⚠️ 本番環境では実行しないでください

-- RLSを無効化（開発環境のみ）
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.observations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;

-- 確認: すべてのデータを表示
SELECT * FROM public.users;
SELECT * FROM public.observations;
SELECT * FROM public.subscriptions;

-- RLSを再度有効化する場合（本番環境用）
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

