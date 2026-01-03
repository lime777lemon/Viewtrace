# Supabaseでのパスワード確認方法

## 重要な注意事項

**パスワードはSupabase Authにハッシュ化されて保存されます。** セキュリティ上の理由から、パスワードを直接確認することはできません。

## パスワードが正しく保存されているかの確認方法

### 方法1: Supabaseダッシュボードでユーザーを確認

1. **Supabaseダッシュボード**を開く: https://supabase.com/dashboard/project/lywcdvevizwopochcpic/auth/users
2. **Authentication** > **Users** を開く
3. 登録したメールアドレスでユーザーを検索
4. ユーザーが存在することを確認

**確認ポイント:**
- ✅ ユーザーが存在する → パスワードは保存されています（ハッシュ化されているため表示されません）
- ❌ ユーザーが存在しない → サインアップが失敗している可能性があります

### 方法2: ログインで確認

1. ログインページ（`/login`）にアクセス
2. 登録時に使用したメールアドレスとパスワードを入力
3. ログインできるか確認

**確認ポイント:**
- ✅ ログイン成功 → パスワードは正しく保存されています
- ❌ ログイン失敗 → パスワードが間違っているか、メール確認が必要な可能性があります

### 方法3: SQLでユーザーを確認

Supabase SQL Editorで以下を実行：

```sql
-- ユーザーの存在を確認（パスワードは表示されません）
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Email confirmed'
    ELSE '❌ Email NOT confirmed'
  END as confirmation_status
FROM auth.users
WHERE email = 'your-email@example.com';
```

## パスワードが保存されない場合の原因

### 1. メール確認が有効になっている

**症状**: サインアップは成功するが、ログインできない

**解決方法**:
1. Supabaseダッシュボード > **Authentication** > **Settings**
2. **Email Auth** セクションで **Enable email confirmations** を **オフ** に変更
3. または、SQLでメール確認を有効化：
   ```sql
   UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;
   ```

### 2. CAPTCHAが有効になっている

**症状**: サインアップ時にエラーが発生する

**解決方法**:
1. Supabaseダッシュボード > **Authentication** > **Settings**
2. **Bot Protection** セクションで **Enable CAPTCHA protection** を **オフ** に変更

### 3. パスワードが漏洩リストに含まれている

**症状**: サインアップ時に「This password has been found in a data breach」エラー

**解決方法**:
- 別のパスワードを選択
- または、開発環境では「Leaked Password Protection」を無効化

## パスワードのリセット方法

現在、パスワードリセット機能は実装されていませんが、以下の方法で対応できます：

### 方法1: 新規登録（同じメールアドレスで上書き）

1. `/signup` にアクセス
2. 同じメールアドレスで新規登録
3. 新しいパスワードを設定

### 方法2: Supabaseダッシュボードからリセット

1. Supabaseダッシュボード > **Authentication** > **Users**
2. ユーザーを検索
3. ユーザーをクリック
4. **Send password reset email** をクリック

## 確認チェックリスト

- [ ] Supabaseダッシュボードでユーザーが存在するか確認
- [ ] ログインページでログインできるか確認
- [ ] メール確認が無効になっているか確認（開発環境）
- [ ] CAPTCHAが無効になっているか確認（開発環境）
- [ ] ブラウザのコンソール（F12）でエラーメッセージを確認

## よくある質問

### Q: パスワードがSupabaseダッシュボードに表示されない

**A:** これは正常です。セキュリティ上の理由から、パスワードはハッシュ化されて保存され、直接確認することはできません。ログインできるかどうかで確認してください。

### Q: サインアップは成功したが、ログインできない

**A:** メール確認が必要な可能性があります。上記の「方法1」または「方法2」を試してください。

### Q: パスワードを忘れた

**A:** 現在、パスワードリセット機能が実装されていないため、新規登録（同じメールアドレスで上書き）を試してください。


