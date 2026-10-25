-- accepted means the provider returned 2xx. It does not mean the message reached an inbox or channel.
-- pending is 429/5xx and may be tried once more in the same week. blocked is never retried.

ALTER TABLE public.evidence_report_delivery_attempts
  DROP CONSTRAINT IF EXISTS evidence_report_delivery_attempts_outcome;

UPDATE public.evidence_report_delivery_attempts
  SET outcome = 'accepted'
  WHERE outcome = 'sent';

UPDATE public.evidence_report_delivery_attempts
  SET outcome = 'blocked'
  WHERE outcome = 'failed' AND provider_response = 'blocked';

ALTER TABLE public.evidence_report_delivery_attempts
  ADD CONSTRAINT evidence_report_delivery_attempts_outcome CHECK (
    outcome IN ('pending', 'accepted', 'failed', 'blocked')
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'evidence_report_delivery_attempts'
      AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.evidence_report_delivery_attempts
      RENAME COLUMN sent_at TO accepted_at;
  END IF;
END $$;

ALTER TABLE public.evidence_report_delivery_attempts
  DROP CONSTRAINT IF EXISTS evidence_report_delivery_attempts_response_len;

ALTER TABLE public.evidence_report_delivery_attempts
  ADD CONSTRAINT evidence_report_delivery_attempts_response_len CHECK (
    provider_response IS NULL OR char_length(provider_response) <= 4096
  );

COMMENT ON COLUMN public.evidence_report_delivery_attempts.accepted_at IS
  'Set when the provider HTTP response is 2xx. Not proof of inbox or channel delivery.';
