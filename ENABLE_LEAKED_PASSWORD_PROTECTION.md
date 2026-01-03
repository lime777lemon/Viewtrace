# Leaked Password Protection を有効化する手順

## 概要

Supabase Authは、HaveIBeenPwned.orgのデータベースと照合して、漏洩したパスワードを使用しているかどうかをチェックする機能を提供しています。

この機能を有効にすると、ユーザーが既に漏洩しているパスワードを使用しようとした場合に警告またはブロックできます。

## 有効化手順

### ステップ1: Supabase Dashboardを開く

1. **Supabase Dashboardにアクセス**
   - https://supabase.com/dashboard/project/lywcdvevizwopochcpic/auth/settings

2. **Authentication > Settings** を開く

### ステップ2: Password Protection セクションを探す

1. ページを下にスクロールして **"Password Protection"** セクションを探す

2. **"Enable leaked password protection"** のトグルを **ON** にする

3. **"Save"** をクリック

## 設定オプション

有効化すると、以下のオプションが利用可能になります：

- **Check on signup**: 登録時にチェック（推奨）
- **Check on password change**: パスワード変更時にチェック（推奨）
- **Action**: 
  - **Warn**: 警告を表示するが、登録/変更を許可
  - **Block**: 登録/変更をブロック（推奨）

## 推奨設定

開発環境と本番環境で異なる設定を推奨します：

### 開発環境（ローカル）

- **Enable leaked password protection**: **ON**
- **Check on signup**: **ON**
- **Check on password change**: **ON**
- **Action**: **Warn**（開発中は警告のみで許可）

### 本番環境

- **Enable leaked password protection**: **ON**
- **Check on signup**: **ON**
- **Check on password change**: **ON**
- **Action**: **Block**（漏洩パスワードは使用不可）

## 注意事項

1. **パフォーマンス**
   - HaveIBeenPwned.orgへのAPIリクエストが発生します
   - 通常は数ミリ秒程度の遅延のみ

2. **プライバシー**
   - パスワードのハッシュ（SHA-1の最初の5文字）のみが送信されます
   - 完全なパスワードは送信されません

3. **可用性**
   - HaveIBeenPwned.orgのサービスが利用できない場合、チェックはスキップされます

## 動作確認

有効化後、以下の手順で動作を確認できます：

1. **新しいユーザーで登録を試す**
   - 漏洩しているパスワード（例: "password123"）を使用
   - 警告またはブロックされることを確認

2. **安全なパスワードで登録を試す**
   - 強力で一意のパスワードを使用
   - 正常に登録できることを確認

## トラブルシューティング

### 問題: 設定が保存されない

**解決策**:
- ページをリロードして再度試す
- ブラウザのキャッシュをクリア

### 問題: チェックが動作しない

**解決策**:
- HaveIBeenPwned.orgのサービスが利用可能か確認
- ネットワーク接続を確認

## まとめ

Leaked Password Protectionは、セキュリティを向上させる重要な機能です。**本番環境では必ず有効化することを推奨します**。

開発環境では、警告のみ（Warn）に設定することで、開発の妨げにならないようにできます。


