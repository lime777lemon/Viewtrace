-- One-off: align Auth user_metadata with TRIAL_CONFIG (50 observations, 30 days).
-- Targets active trial users without a Stripe subscription. Safe to re-run (idempotent).

UPDATE auth.users
SET
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'trial_free_observations', 50,
      'trial_days', 30
    ),
  updated_at = now()
WHERE raw_user_meta_data->>'trial_started_at' IS NOT NULL
  AND COALESCE(raw_user_meta_data->>'trial_active', 'true') <> 'false'
  AND (
    raw_user_meta_data->>'stripe_subscription_id' IS NULL
    OR btrim(raw_user_meta_data->>'stripe_subscription_id') = ''
  )
  AND (
    (raw_user_meta_data->>'trial_free_observations')::int IS DISTINCT FROM 50
    OR (raw_user_meta_data->>'trial_days')::int IS DISTINCT FROM 30
  );
