-- Optional Watch email when stored title / canonical / noindex differ.
-- Default off. Does not create an extra Observation.

ALTER TABLE public.observation_watches
  ADD COLUMN IF NOT EXISTS notify_on_metadata boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.observation_watches.notify_on_metadata IS
  'When true, cron also emails if title / canonical / noindex changed. Default false. No extra Observation.';
