# Supabase テーブル確認ガイド

## テーブルが空の場合の確認手順

### 1. データベーススキーマが実行されているか確認

1. Supabaseダッシュボード > **SQL Editor** に移動
2. 以下のクエリを実行してテーブルが存在するか確認：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'observations', 'subscriptions');
```

テーブルが存在しない場合：
- `supabase/schema.sql` の内容をSQL Editorで実行してください

### 2. RLS（Row Level Security）の確認

SupabaseのTable Editorでデータが見えない場合、RLSポリシーの影響の可能性があります。

**確認方法：**
1. Supabaseダッシュボード > **Authentication** > **Users** でユーザーが作成されているか確認
2. **Table Editor** > **users** テーブルを開く
3. データが表示されない場合、RLSポリシーが原因の可能性があります

**解決方法：**
開発環境では、RLSを一時的に無効化して確認できます：

```sql
-- RLSを一時的に無効化（開発環境のみ）
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.observations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
```

⚠️ **注意**: 本番環境ではRLSを有効にしてください。

### 3. ユーザープロファイル作成の確認

ブラウザの開発者ツール（F12）> **Console** タブでエラーを確認：

- `Profile creation error:` というエラーが出ていないか確認
- エラーメッセージの内容を確認

### 4. 手動でデータを確認

SQL Editorで以下のクエリを実行：

```sql
-- すべてのユーザーを確認
SELECT * FROM public.users;

-- 認証ユーザーを確認
SELECT * FROM auth.users;

-- 観測を確認
SELECT * FROM public.observations;
```

### 5. データが存在するが表示されない場合

**Table Editorの設定を確認：**
1. Table Editorで **Filter** や **Sort** が設定されていないか確認
2. 別のビュー（View）を見ていないか確認
3. 正しいプロジェクトを選択しているか確認

### 6. デバッグ用クエリ

```sql
-- ユーザー数とプロファイル数を確認
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as profile_users_count;

-- プロファイルがない認証ユーザーを確認
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
```

