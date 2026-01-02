# どのSQLファイルを実行すればいいか？

## 現在の状況

Supabaseの`public`スキーマに以下の3つのテーブルが存在します：
- ✅ `users`
- ✅ `observations`
- ✅ `subscriptions`

## 推奨：`clean-fix.sql`を実行

**既にテーブルが存在する場合**は、`clean-fix.sql`を実行してください。

### 理由

1. **`schema.sql`は初回セットアップ用**
   - テーブルが既に存在する場合、`CREATE TABLE IF NOT EXISTS`でもエラーになる可能性があります
   - 関数とトリガーの定義が古い（`search_path`が設定されていない）

2. **`clean-fix.sql`は修正用**
   - 既存のテーブルに影響を与えずに関数とトリガーを修正
   - セキュリティ警告を解消
   - メール確認も有効化

## 実行手順

### ステップ1: Supabase SQL Editorを開く

https://supabase.com/dashboard/project/lywcdvevizwopochcpic/sql/new

### ステップ2: `clean-fix.sql`の内容をコピー＆ペースト

ファイル: `supabase/clean-fix.sql`

### ステップ3: Run をクリック

## 実行される内容

`clean-fix.sql`を実行すると：

1. **既存のトリガーを削除**（安全）
   ```sql
   DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
   DROP TRIGGER IF EXISTS update_observations_updated_at ON public.observations;
   DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
   ```

2. **古い関数を削除**（安全）
   ```sql
   DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
   ```

3. **新しい関数を作成**（`search_path`セキュリティ修正済み）
   ```sql
   CREATE OR REPLACE FUNCTION public.update_updated_at_column()
   RETURNS TRIGGER
   LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = 'pg_catalog'  -- ← これが追加される
   AS $$
   BEGIN
     NEW.updated_at = TIMEZONE('utc'::text, NOW());
     RETURN NEW;
   END;
   $$;
   ```

4. **トリガーを再作成**（`public.`プレフィックス付き）
   ```sql
   CREATE TRIGGER update_users_updated_at 
     BEFORE UPDATE ON public.users
     FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
   ```

5. **メール確認を有効化**（ログイン問題の解決）
   ```sql
   UPDATE auth.users 
   SET email_confirmed_at = NOW() 
   WHERE email_confirmed_at IS NULL;
   ```

## 各SQLファイルの用途

| ファイル | 用途 | 実行タイミング |
|---------|------|---------------|
| `schema.sql` | 初回セットアップ（テーブル作成） | テーブルが存在しない場合のみ |
| `clean-fix.sql` | セキュリティ修正 + メール確認 | **既にテーブルが存在する場合（推奨）** |
| `check-user-password.sql` | ユーザー状態の確認 | 確認したい時のみ |
| `apply-schema-fix.sql` | 関数のみ修正（メール確認なし） | メール確認が不要な場合 |

## 結論

**`clean-fix.sql`を実行してください。**

これで以下が修正されます：
- ✅ セキュリティ警告（`search_path`）の解消
- ✅ 関数とトリガーの更新
- ✅ メール確認の有効化（ログイン問題の解決）

## 実行後の確認

実行後、以下のクエリで確認できます：

```sql
-- 関数が正しく作成されたか確認
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as search_path_config
FROM pg_proc
WHERE proname = 'update_updated_at_column'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

期待される結果：
- `is_security_definer`: `true`
- `search_path_config`: `{search_path=pg_catalog}`

