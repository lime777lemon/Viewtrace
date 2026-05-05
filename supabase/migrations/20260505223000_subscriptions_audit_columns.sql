-- Ensure public.subscriptions has audit columns for Stripe webhooks.
-- Safe to run on existing tables: adds columns/indexes if missing.

DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NULL THEN
    RAISE NOTICE 'public.subscriptions が存在しません。先にテーブルを作成してください。';
    RETURN;
  END IF;

  -- Required ownership column for RLS policies & audits
  ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS user_id uuid;

  -- Stripe identifiers
  ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS stripe_customer_id text,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
    ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

  -- Subscription state snapshot
  ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS plan_id text,
    ADD COLUMN IF NOT EXISTS status text,
    ADD COLUMN IF NOT EXISTS mode text,
    ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

  ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

  -- Uniqueness for upsert
  CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_uniq
    ON public.subscriptions (stripe_subscription_id)
    WHERE stripe_subscription_id IS NOT NULL;

  CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx
    ON public.subscriptions (user_id);
END $$;

