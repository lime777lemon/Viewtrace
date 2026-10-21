-- Diff and Alert are stored apart from the child evidence.
-- Evidence rows stay on Observation and Journey Run. These columns freeze the judgment.

ALTER TABLE public.monitoring_runs
  ADD COLUMN IF NOT EXISTS diff jsonb,
  ADD COLUMN IF NOT EXISTS alerts jsonb;
