-- Evidence Report destinations besides email and Slack.
-- Teams and other webhooks are HTTPS URLs. PagerDuty stores an Events API v2 routing key.

ALTER TABLE public.evidence_report_settings
  ADD COLUMN IF NOT EXISTS teams_webhook_url text,
  ADD COLUMN IF NOT EXISTS pagerduty_routing_key text,
  ADD COLUMN IF NOT EXISTS other_webhook_url text;

ALTER TABLE public.evidence_report_settings
  DROP CONSTRAINT IF EXISTS evidence_report_settings_teams_len,
  DROP CONSTRAINT IF EXISTS evidence_report_settings_teams_https,
  DROP CONSTRAINT IF EXISTS evidence_report_settings_pagerduty_key,
  DROP CONSTRAINT IF EXISTS evidence_report_settings_other_len,
  DROP CONSTRAINT IF EXISTS evidence_report_settings_other_https;

ALTER TABLE public.evidence_report_settings
  ADD CONSTRAINT evidence_report_settings_teams_len CHECK (
    teams_webhook_url IS NULL OR char_length(teams_webhook_url) <= 2000
  ),
  ADD CONSTRAINT evidence_report_settings_teams_https CHECK (
    teams_webhook_url IS NULL OR teams_webhook_url ~ '^https://'
  ),
  ADD CONSTRAINT evidence_report_settings_pagerduty_key CHECK (
    pagerduty_routing_key IS NULL OR pagerduty_routing_key ~ '^[A-Za-z0-9]{32}$'
  ),
  ADD CONSTRAINT evidence_report_settings_other_len CHECK (
    other_webhook_url IS NULL OR char_length(other_webhook_url) <= 2000
  ),
  ADD CONSTRAINT evidence_report_settings_other_https CHECK (
    other_webhook_url IS NULL OR other_webhook_url ~ '^https://'
  );

ALTER TABLE public.evidence_report_deliveries
  ADD COLUMN IF NOT EXISTS teams_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pagerduty_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS webhook_sent_at timestamptz;
