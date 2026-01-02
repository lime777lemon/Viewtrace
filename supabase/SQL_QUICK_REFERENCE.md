# SQL クイックリファレンス

## よく使うSQL一覧

### 1. メール確認を有効化（ログイン問題の解決）

**ファイル**: `fix-email-confirmation.sql`

```sql
-- 全ユーザーのメール確認を有効化
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- 確認
SELECT 
  COUNT(*) as total_users,
  COUNT(email_confirmed_at) as confirmed_users,
  COUNT(*) - COUNT(email_confirmed_at) as unconfirmed_users,
  CASE 
    WHEN COUNT(*) - COUNT(email_confirmed_at) = 0 THEN '✅ All users can login'
    ELSE '⚠️ Some users still need confirmation'
  END as status
FROM auth.users;
```

**用途**: ログインできない問題を解決

---

### 2. 全ユーザーの状態を確認

**ファイル**: `check-all-users.sql`

```sql
-- 全ユーザーの状態を確認
SELECT 
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  encrypted_password IS NOT NULL as has_password,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN encrypted_password IS NULL THEN '❌ No password'
    WHEN email_confirmed_at IS NULL THEN '⚠️ Password OK but email not confirmed'
    ELSE '✅ Ready to login'
  END as status
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- サマリー
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN encrypted_password IS NOT NULL THEN 1 END) as users_with_password,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users,
  COUNT(CASE WHEN encrypted_password IS NOT NULL AND email_confirmed_at IS NOT NULL THEN 1 END) as ready_to_login
FROM auth.users;
```

**用途**: ユーザーの状態を一覧で確認

---

### 3. セキュリティ修正とメール確認

**ファイル**: `clean-fix.sql`

```sql
-- セキュリティ警告の修正（search_path）
-- メール確認の有効化
-- 詳細は clean-fix.sql を参照
```

**用途**: セキュリティ警告を修正し、メール確認も有効化

---

### 4. プロファイルが存在しないユーザーを修正

**ファイル**: `fix-duplicate-users.sql`

```sql
-- auth.usersに存在するが、public.usersに存在しないユーザーのプロファイルを作成
INSERT INTO public.users (
  id, email, name, plan, billing_period, 
  subscription_status, observations_limit, observations_used
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  COALESCE(au.raw_user_meta_data->>'plan', 'starter') as plan,
  COALESCE(au.raw_user_meta_data->>'billing', 'monthly') as billing_period,
  'active' as subscription_status,
  CASE 
    WHEN au.raw_user_meta_data->>'plan' = 'pro' THEN 200
    ELSE 50
  END as observations_limit,
  0 as observations_used
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

**用途**: プロファイルが存在しないユーザーを修正

---

### 5. パスワードの状態を確認

**ファイル**: `check-user-password.sql`

```sql
-- 全ユーザーのパスワード状態を確認
SELECT 
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  encrypted_password IS NOT NULL as has_password,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN encrypted_password IS NULL THEN '❌ No password'
    WHEN email_confirmed_at IS NULL THEN '⚠️ Password OK but email not confirmed'
    ELSE '✅ Ready to login'
  END as status
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;
```

**用途**: パスワードが正しく保存されているか確認

---

## 実行手順

1. **Supabase SQL Editorを開く**
   - https://supabase.com/dashboard/project/lywcdvevizwopochcpic/sql/new

2. **SQLファイルの内容をコピー＆ペースト**

3. **Run をクリック**

## よくある問題と解決方法

### 問題: ログインできない

**解決方法**:
```sql
-- fix-email-confirmation.sql を実行
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;
```

### 問題: プロファイルが存在しない

**解決方法**:
```sql
-- fix-duplicate-users.sql を実行
-- （上記のINSERT文を実行）
```

### 問題: セキュリティ警告が出る

**解決方法**:
```sql
-- clean-fix.sql を実行
-- （search_pathの修正）
```

## ファイル一覧

| ファイル名 | 用途 |
|-----------|------|
| `fix-email-confirmation.sql` | メール確認を有効化 |
| `check-all-users.sql` | 全ユーザーの状態を確認 |
| `check-user-password.sql` | パスワードの状態を確認 |
| `clean-fix.sql` | セキュリティ修正 + メール確認 |
| `fix-duplicate-users.sql` | プロファイルを作成 |
| `fix-login-complete.sql` | ログイン問題の完全修正 |
| `diagnose-login-issue.sql` | ログイン問題の診断 |
| `schema.sql` | データベーススキーマ（初回セットアップ） |

## 注意事項

- ⚠️ **DELETE文は慎重に実行してください**
- ✅ **UPDATE文は実行前に確認してください**
- 📝 **本番環境では必ずバックアップを取ってから実行してください**

