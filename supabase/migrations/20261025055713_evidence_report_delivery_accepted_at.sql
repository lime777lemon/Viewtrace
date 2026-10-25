-- Week rollup timestamps mean the provider returned 2xx. Attempt rows keep attempted_at and accepted_at.

ALTER TABLE public.evidence_report_deliveries
  RENAME COLUMN email_sent_at TO email_accepted_at;

ALTER TABLE public.evidence_report_deliveries
  RENAME COLUMN slack_sent_at TO slack_accepted_at;

ALTER TABLE public.evidence_report_deliveries
  RENAME COLUMN teams_sent_at TO teams_accepted_at;

ALTER TABLE public.evidence_report_deliveries
  RENAME COLUMN pagerduty_sent_at TO pagerduty_accepted_at;

ALTER TABLE public.evidence_report_deliveries
  RENAME COLUMN webhook_sent_at TO webhook_accepted_at;

COMMENT ON COLUMN public.evidence_report_deliveries.email_accepted_at IS
  'Set when the mail API returns 2xx. Not proof the message reached an inbox.';
COMMENT ON COLUMN public.evidence_report_deliveries.slack_accepted_at IS
  'Set when the Slack webhook returns 2xx. Not proof the message appeared in a channel.';
COMMENT ON COLUMN public.evidence_report_deliveries.teams_accepted_at IS
  'Set when the Teams webhook returns 2xx. Redirects are not followed.';
COMMENT ON COLUMN public.evidence_report_deliveries.pagerduty_accepted_at IS
  'Set when PagerDuty Events API returns 2xx.';
COMMENT ON COLUMN public.evidence_report_deliveries.webhook_accepted_at IS
  'Set when the other HTTPS endpoint returns 2xx. Redirects are not followed.';
