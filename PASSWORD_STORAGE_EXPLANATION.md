# パスワードの保存について

## パスワードはSupabaseに保存されています ✅

登録時にパスワードを入力すると、**Supabaseの`auth.users`テーブルに確実に保存されます**。

## 重要なポイント

### 1. パスワードはハッシュ化されて保存される

- **セキュリティ上の理由**で、パスワードは**ハッシュ化**（暗号化）されて保存されます
- **平文（元のパスワード）は保存されません**
- これは**正常な動作**です

### 2. パスワードを直接確認することはできない

- Supabase Dashboardでも、SQLでも、**元のパスワードを見ることはできません**
- これは**セキュリティのベストプラクティス**です

### 3. パスワードが保存されているか確認する方法

以下のSQLを実行して、パスワードが保存されているか確認できます：

```sql
SELECT 
  email,
  encrypted_password IS NOT NULL as has_password,
  CASE 
    WHEN encrypted_password IS NULL THEN '❌ No password'
    ELSE '✅ Password is stored (hashed)'
  END as password_status
FROM auth.users
WHERE email = 'yuki.ikeda7887@gmail.com';
```

- `has_password`が`true`（または`t`）なら、パスワードは保存されています
- `password_status`が`✅ Password is stored (hashed)`なら、正常です

## パスワードが保存されていない場合

もし`has_password`が`false`の場合、以下の可能性があります：

1. **登録時にエラーが発生した**
   - ブラウザのコンソール（F12）でエラーを確認
   - ネットワークタブでAPIリクエストを確認

2. **パスワードが正しく送信されなかった**
   - 登録フォームでパスワードが入力されているか確認
   - パスワードのバリデーション（8文字以上、大文字・小文字・数字を含む）を確認

## パスワードをリセットする方法

パスワードを忘れた場合や、新しいパスワードを設定したい場合：

### 方法1: Supabase Dashboardから

1. Supabase Dashboard > Authentication > Users
2. ユーザーを選択
3. 「Reset Password」をクリック
4. メールが送信される

### 方法2: パスワードリセット機能を実装する（推奨）

フロントエンドに「Forgot Password」機能を追加することを推奨します。

## ログインできない場合の確認手順

1. **パスワードが保存されているか確認**
   ```sql
   SELECT encrypted_password IS NOT NULL as has_password
   FROM auth.users
   WHERE email = 'your-email@example.com';
   ```

2. **メール確認が有効になっているか確認**
   ```sql
   SELECT email_confirmed_at IS NOT NULL as is_confirmed
   FROM auth.users
   WHERE email = 'your-email@example.com';
   ```

3. **パスワードが正しいか確認**
   - ログインページで再度入力してみる
   - 大文字・小文字・数字が正しく入力されているか確認

## まとめ

- ✅ **パスワードはSupabaseに保存されています**
- ✅ **ハッシュ化されて保存されるのは正常です**
- ✅ **元のパスワードを見ることはできません**（セキュリティ上）
- ✅ **ログインできるかどうかで、パスワードが正しく保存されているか確認できます**

## 確認用SQL

`supabase/check-password-storage.sql`を実行すると、パスワードの保存状況を確認できます。

