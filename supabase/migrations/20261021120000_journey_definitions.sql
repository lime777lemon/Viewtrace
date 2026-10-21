-- User-defined Journey Monitoring. Discovery tables are unchanged.
-- Credentials stay in secret_credentials and are not selected by the dashboard.

CREATE TABLE IF NOT EXISTS public.journey_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  start_url text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  regions text[] NOT NULL DEFAULT ARRAY['US-CA']::text[],
  device_classes text[] NOT NULL DEFAULT ARRAY['desktop']::text[],
  watch_enabled boolean NOT NULL DEFAULT false,
  watch_frequency text NOT NULL DEFAULT 'daily',
  next_run_at timestamptz,
  last_run_at timestamptz,
  secret_credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journey_definitions_name_len CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  CONSTRAINT journey_definitions_url_len CHECK (char_length(trim(start_url)) BETWEEN 8 AND 500),
  CONSTRAINT journey_definitions_frequency_chk CHECK (watch_frequency IN ('daily', 'weekly'))
);

CREATE TABLE IF NOT EXISTS public.journey_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journey_definitions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  region text NOT NULL,
  device_class text NOT NULL,
  environment jsonb,
  status text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  alert text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journey_runs_status_chk CHECK (status IN ('passed', 'failed', 'blocked', 'incomplete')),
  CONSTRAINT journey_runs_device_chk CHECK (device_class IN ('desktop', 'mobile'))
);

CREATE INDEX IF NOT EXISTS journey_definitions_due_idx
  ON public.journey_definitions (watch_enabled, next_run_at)
  WHERE watch_enabled = true;

CREATE INDEX IF NOT EXISTS journey_runs_lookup_idx
  ON public.journey_runs (journey_id, region, device_class, created_at DESC);

ALTER TABLE public.journey_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.journey_definitions FROM anon;
REVOKE ALL ON TABLE public.journey_definitions FROM PUBLIC;
REVOKE ALL ON TABLE public.journey_runs FROM anon;
REVOKE ALL ON TABLE public.journey_runs FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.journey_definitions TO authenticated;
GRANT SELECT, INSERT ON TABLE public.journey_runs TO authenticated;

DROP POLICY IF EXISTS journey_definitions_select_own ON public.journey_definitions;
DROP POLICY IF EXISTS journey_definitions_insert_own ON public.journey_definitions;
DROP POLICY IF EXISTS journey_definitions_update_own ON public.journey_definitions;
DROP POLICY IF EXISTS journey_definitions_delete_own ON public.journey_definitions;
DROP POLICY IF EXISTS journey_runs_select_own ON public.journey_runs;
DROP POLICY IF EXISTS journey_runs_insert_own ON public.journey_runs;

CREATE POLICY journey_definitions_select_own
  ON public.journey_definitions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY journey_definitions_insert_own
  ON public.journey_definitions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY journey_definitions_update_own
  ON public.journey_definitions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY journey_definitions_delete_own
  ON public.journey_definitions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY journey_runs_select_own
  ON public.journey_runs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY journey_runs_insert_own
  ON public.journey_runs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
