-- Per-channel Evidence Report delivery results. Service role only.
-- outcome is sent or failed. sent_at is set only when the provider accepted the send.

CREATE TABLE IF NOT EXISTS public.evidence_report_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  period_start date NOT NULL,
  channel text NOT NULL,
  outcome text NOT NULL,
  http_status integer,
  provider_response text,
  sent_at timestamptz,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_report_delivery_attempts_channel CHECK (
    channel IN ('email', 'slack', 'teams', 'pagerduty', 'webhook')
  ),
  CONSTRAINT evidence_report_delivery_attempts_outcome CHECK (
    outcome IN ('sent', 'failed')
  ),
  CONSTRAINT evidence_report_delivery_attempts_http_status CHECK (
    http_status IS NULL OR (http_status >= 100 AND http_status <= 599)
  ),
  CONSTRAINT evidence_report_delivery_attempts_response_len CHECK (
    provider_response IS NULL OR char_length(provider_response) <= 500
  )
);

COMMENT ON TABLE public.evidence_report_delivery_attempts IS
  'One row per Evidence Report channel attempt. Provider text is redacted before insert. Service role only.';

ALTER TABLE public.evidence_report_delivery_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.evidence_report_delivery_attempts FROM anon;
REVOKE ALL ON TABLE public.evidence_report_delivery_attempts FROM authenticated;
REVOKE ALL ON TABLE public.evidence_report_delivery_attempts FROM PUBLIC;

CREATE INDEX IF NOT EXISTS evidence_report_delivery_attempts_user_period
  ON public.evidence_report_delivery_attempts (user_id, period_start, attempted_at DESC);
