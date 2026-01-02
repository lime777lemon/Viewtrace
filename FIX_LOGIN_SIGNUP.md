# ログイン・登録問題の修正手順

## 問題の原因

1. **`/api/users/create`が存在しない**
   - 登録時にプロファイル作成が失敗していた
   - ログイン時の自動プロファイル作成も失敗していた

2. **RLSポリシーによるブロック**
   - クライアント側から直接`public.users`に挿入しようとしていた
   - Service Role Keyを使用するAPIルートが必要

3. **重複ユーザーの問題**
   - `auth.users`には存在するが、`public.users`には存在しない
   - 再度登録しようとすると「既に登録されています」エラー

## 修正内容

### 1. `/api/users/create`を再作成 ✅
   - Service Role Keyを使用してRLSをバイパス
   - リトライロジックを追加

### 2. 登録ページの修正 ✅
   - APIルートを使用するように変更
   - 「既に登録されています」エラーの適切な処理
   - ログインページへの自動リダイレクト

### 3. 重複ユーザーのクリーンアップSQL ✅
   - `supabase/fix-duplicate-users.sql`を作成

## 実行手順

### ステップ1: Supabaseで重複ユーザーを確認

1. **Supabase SQL Editorを開く**
   - https://supabase.com/dashboard/project/lywcdvevizwopochcpic/sql/new

2. **以下のクエリを実行して状況を確認**

```sql
-- 重複ユーザーの確認
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  pu.id as profile_id,
  CASE 
    WHEN pu.id IS NULL THEN '❌ No profile'
    ELSE '✅ Profile exists'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;
```

### ステップ2: 重複ユーザーを修正（必要に応じて）

1. **`supabase/fix-duplicate-users.sql`を実行**
   - ステップ4で、`auth.users`に存在するが`public.users`に存在しないユーザーのプロファイルを自動作成

### ステップ3: 開発サーバーを再起動

```bash
# 開発サーバーを停止（Ctrl+C）
# その後、再起動
npm run dev
```

### ステップ4: テスト

1. **新しいメールアドレスで登録を試す**
   - 正常に登録できるか確認

2. **既存のメールアドレスで登録を試す**
   - 「既に登録されています」というメッセージが表示され、ログインページにリダイレクトされるか確認

3. **ログインを試す**
   - 正常にログインできるか確認

## トラブルシューティング

### 問題: まだ「既に登録されています」エラーが出る

**解決策**:
1. Supabaseで重複ユーザーを削除
2. `supabase/fix-duplicate-users.sql`のステップ3を実行（重複ユーザーを削除）

### 問題: ログインできない

**解決策**:
1. `supabase/clean-fix.sql`を実行（メール確認を有効化）
2. または、Supabase Dashboard > Authentication > Settings で「Enable email confirmations」をOFFにする

### 問題: プロファイル作成が失敗する

**解決策**:
1. `.env.local`に`SUPABASE_SERVICE_ROLE_KEY`が設定されているか確認
2. ブラウザのコンソール（F12）でエラーを確認
3. Supabase Dashboard > Settings > API でService Role Keyを確認

## 確認事項

- [ ] `/api/users/create`が存在する
- [ ] `.env.local`に`SUPABASE_SERVICE_ROLE_KEY`が設定されている
- [ ] 開発サーバーを再起動した
- [ ] 新しいメールアドレスで登録できる
- [ ] 既存のメールアドレスで適切なエラーメッセージが表示される
- [ ] ログインできる

