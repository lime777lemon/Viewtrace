-- Optional outgoing webhook for successful auto-observations (Slack / Zapier / Make, etc.)

ALTER TABLE public.observation_watches
  ADD COLUMN IF NOT EXISTS webhook_url text;

COMMENT ON COLUMN public.observation_watches.webhook_url IS
  'Optional HTTPS URL. Cron POSTs JSON after a successful scheduled observation.';
