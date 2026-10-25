-- Extra Evidence Report email addresses. The account email is still included at send time.

ALTER TABLE public.evidence_report_settings
  ADD COLUMN IF NOT EXISTS email_recipients text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.evidence_report_settings
  DROP CONSTRAINT IF EXISTS evidence_report_settings_email_recipients;

ALTER TABLE public.evidence_report_settings
  ADD CONSTRAINT evidence_report_settings_email_recipients CHECK (
    cardinality(email_recipients) <= 10
    AND (
      cardinality(email_recipients) = 0
      OR array_to_string(email_recipients, ',') ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}(,[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})*$'
    )
  );

COMMENT ON COLUMN public.evidence_report_settings.email_recipients IS
  'Extra Monday Evidence Report recipients. Account email is added when email_enabled is true.';
