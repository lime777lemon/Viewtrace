# Stripe Checkout フロー

## 概要

ユーザーがViewtraceにサインアップし、Stripe Checkoutで決済を行う際の完全なフローです。

## フロー

### 1. ユーザーがサインアップ（Supabase Auth）

```
ユーザーがサインアップページで登録
  ↓
Supabase Authでユーザーアカウント作成
  ↓
/api/users/create でプロファイル作成
```

### 2. 「Get Started（Starter / Pro）」をクリック

```
サインアップ完了後、Stripe Checkoutにリダイレクト
  ↓
/api/checkout?plan=starter&email=...&billing=monthly&userId=...
```

### 3. Stripe Checkout Session を作成

**ファイル**: `app/api/checkout/route.ts`

```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  mode: 'subscription',
  customer_email: email,
  client_reference_id: userId, // Supabase user ID
  line_items: [{ price: priceId, quantity: 1 }],
  metadata: {
    plan,
    billing,
    userId, // Backup in metadata
  },
})
```

**重要なポイント**:
- `client_reference_id`: SupabaseのユーザーIDを渡す（Webhookで使用）
- `metadata`: プラン情報とユーザーIDを保存（バックアップ）

### 4. Stripe が自動で Customer を作成

Stripeが`customer_email`から自動的にCustomerを作成します。

### 5. Webhook で Supabase に stripe_customer_id を保存

**ファイル**: `app/api/webhooks/stripe/route.ts`

#### `checkout.session.completed` イベント

```typescript
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session
  
  // Get data from session
  const userId = session.metadata?.userId || session.client_reference_id
  const customerId = session.customer as string // Stripe Customer ID
  const subscriptionId = session.subscription as string
  
  // Update user with stripe_customer_id
  await supabase
    .from('users')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
      plan: plan,
      billing_period: billing,
    })
    .eq('id', userId)
  
  // Create subscription record
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId,
      plan: plan,
      billing_period: billing,
      status: subscription.status,
      current_period_start: ...,
      current_period_end: ...,
    })
}
```

## データベース更新

### `public.users` テーブル

以下のフィールドが更新されます：
- `stripe_customer_id`: Stripe Customer ID
- `stripe_subscription_id`: Stripe Subscription ID
- `subscription_status`: `'active'`
- `plan`: `'starter'` または `'pro'`
- `billing_period`: `'monthly'` または `'annual'`
- `observations_limit`: プランに応じて50または200

### `public.subscriptions` テーブル

新しいレコードが作成されます：
- `user_id`: Supabase User ID
- `stripe_subscription_id`: Stripe Subscription ID
- `stripe_price_id`: Stripe Price ID
- `plan`: プラン名
- `billing_period`: 請求期間
- `status`: サブスクリプションステータス
- `current_period_start`: 現在の期間の開始日
- `current_period_end`: 現在の期間の終了日

## その他のWebhookイベント

### `customer.subscription.updated`

サブスクリプションが更新された場合（プラン変更、請求期間変更など）:
- `subscriptions`テーブルを更新
- `users.subscription_status`を更新

### `customer.subscription.deleted`

サブスクリプションがキャンセルされた場合:
- `subscriptions.status`を`'canceled'`に更新
- `users.subscription_status`を`'canceled'`に更新

## 環境変数

以下の環境変数が必要です：

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Stripe Webhook設定

1. **Stripe Dashboard > Developers > Webhooks**
2. **Add endpoint** をクリック
3. **Endpoint URL**: `https://your-domain.com/api/webhooks/stripe`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. **Signing secret** をコピーして `.env.local` に設定

## テスト方法

### ローカル開発

1. **Stripe CLI** を使用してWebhookを転送:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

2. **Webhook signing secret** を取得:
   ```bash
   stripe listen --print-secret
   ```

3. **`.env.local`** に設定:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 本番環境

1. Stripe DashboardでWebhookエンドポイントを設定
2. Webhook signing secretを環境変数に設定
3. テストイベントを送信して動作確認

## トラブルシューティング

### 問題: Webhookが実行されない

**解決策**:
- Webhookエンドポイントが正しく設定されているか確認
- Webhook signing secretが正しいか確認
- Stripe Dashboard > Webhooks でイベントログを確認

### 問題: stripe_customer_idが保存されない

**解決策**:
- `checkout.session.completed`イベントが送信されているか確認
- `userId`が正しく`client_reference_id`または`metadata`に含まれているか確認
- Supabaseのログでエラーを確認

### 問題: サブスクリプションステータスが更新されない

**解決策**:
- `customer.subscription.updated`イベントが送信されているか確認
- `stripe_subscription_id`で正しいレコードを更新しているか確認

## まとめ

このフローにより、以下が実現されます：

1. ✅ ユーザーがSupabase Authでサインアップ
2. ✅ Stripe Checkout Sessionが作成される
3. ✅ Stripeが自動でCustomerを作成
4. ✅ Webhookで`stripe_customer_id`がSupabaseに保存される
5. ✅ サブスクリプション情報が`subscriptions`テーブルに保存される


