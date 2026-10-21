-- Notification outcome is separate from the saved alerts.
-- Policy decides delivery. It does not create or remove alerts.

ALTER TABLE public.monitoring_runs
  ADD COLUMN IF NOT EXISTS notification jsonb;
