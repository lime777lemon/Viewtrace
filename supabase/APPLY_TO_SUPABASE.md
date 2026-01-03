# Supabaseに修正内容を反映する手順

## 方法1: `clean-fix.sql`を使用（推奨）

既に`clean-fix.sql`に関数の修正が含まれているので、これを使用するのが最も簡単です。

### 実行手順

1. **Supabase SQL Editorを開く**
   - https://supabase.com/dashboard/project/lywcdvevizwopochcpic/sql/new

2. **`supabase/clean-fix.sql`の内容をコピー＆ペースト**

3. **Run をクリック**

これで以下が実行されます：
- ✅ 関数の`search_path`セキュリティ修正
- ✅ トリガーの再作成
- ✅ メール確認の有効化

## 方法2: `apply-schema-fix.sql`を使用（関数のみ修正したい場合）

関数とトリガーのみを修正したい場合（メール確認は不要な場合）は、こちらを使用します。

### 実行手順

1. **Supabase SQL Editorを開く**
   - https://supabase.com/dashboard/project/lywcdvevizwopochcpic/sql/new

2. **`supabase/apply-schema-fix.sql`の内容をコピー＆ペースト**

3. **Run をクリック**

これで以下が実行されます：
- ✅ 関数の`search_path`セキュリティ修正
- ✅ トリガーの再作成
- ✅ 検証クエリ（関数とトリガーが正しく作成されたか確認）

## 修正内容の確認

実行後、以下のクエリで確認できます：

```sql
-- 関数の確認
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as search_path_config
FROM pg_proc
WHERE proname = 'update_updated_at_column'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- トリガーの確認
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as is_enabled
FROM pg_trigger
WHERE tgname IN (
  'update_users_updated_at',
  'update_observations_updated_at',
  'update_subscriptions_updated_at'
)
ORDER BY tgname;
```

## 期待される結果

### 関数の確認結果
- `function_name`: `update_updated_at_column`
- `is_security_definer`: `true` (または `t`)
- `search_path_config`: `{search_path=pg_catalog}`

### トリガーの確認結果
3つのトリガーが表示される：
- `update_users_updated_at` → `users`
- `update_observations_updated_at` → `observations`
- `update_subscriptions_updated_at` → `subscriptions`

## エラーが発生した場合

### エラー: "function does not exist"
→ 既に削除されている場合は問題ありません。`DROP FUNCTION IF EXISTS`が含まれているので、エラーは無視して続行できます。

### エラー: "table does not exist"
→ テーブルがまだ作成されていない場合は、先に`schema.sql`を実行してください。

### エラー: "permission denied"
→ Service Role Keyを使用しているか確認してください。通常のSQL Editorでは実行可能です。

## 推奨実行順序

1. **既にテーブルが存在する場合**
   - `clean-fix.sql` を実行（関数修正 + メール確認）

2. **初回セットアップの場合**
   - `schema.sql` を実行（テーブル作成）
   - `clean-fix.sql` を実行（関数修正 + メール確認）


