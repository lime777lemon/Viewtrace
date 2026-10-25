-- Weekly Evidence Report preferences and send ledger.
-- Separate from Watch alerts. Service role sends. Owners edit their own settings.

CREATE TABLE IF NOT EXISTS public.evidence_report_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  slack_webhook_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_report_settings_slack_len CHECK (
    slack_webhook_url IS NULL OR char_length(slack_webhook_url) <= 500
  ),
  CONSTRAINT evidence_report_settings_slack_host CHECK (
    slack_webhook_url IS NULL
    OR slack_webhook_url ~ '^https://hooks\.slack\.com/'
  )
);

COMMENT ON TABLE public.evidence_report_settings IS
  'Monday Evidence Report delivery. Not a Watch alert. Missing row means email on, Slack off.';

ALTER TABLE public.evidence_report_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.evidence_report_settings FROM anon;
REVOKE ALL ON TABLE public.evidence_report_settings FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.evidence_report_settings TO authenticated;

DROP POLICY IF EXISTS evidence_report_settings_select_own ON public.evidence_report_settings;
DROP POLICY IF EXISTS evidence_report_settings_insert_own ON public.evidence_report_settings;
DROP POLICY IF EXISTS evidence_report_settings_update_own ON public.evidence_report_settings;

CREATE POLICY evidence_report_settings_select_own
  ON public.evidence_report_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY evidence_report_settings_insert_own
  ON public.evidence_report_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY evidence_report_settings_update_own
  ON public.evidence_report_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.evidence_report_deliveries (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  period_start date NOT NULL,
  email_sent_at timestamptz,
  slack_sent_at timestamptz,
  PRIMARY KEY (user_id, period_start)
);

COMMENT ON TABLE public.evidence_report_deliveries IS
  'One Evidence Report send per user per JST week. Service role only.';

ALTER TABLE public.evidence_report_deliveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.evidence_report_deliveries FROM anon;
REVOKE ALL ON TABLE public.evidence_report_deliveries FROM authenticated;
REVOKE ALL ON TABLE public.evidence_report_deliveries FROM PUBLIC;
