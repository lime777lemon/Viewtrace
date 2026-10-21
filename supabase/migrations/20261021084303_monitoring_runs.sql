-- Monitoring Run is one orchestrated check. It stores the plan and links
-- to Observation and Journey Run rows. Screenshot, Working counts, and step
-- evidence stay on those children.

CREATE TABLE IF NOT EXISTS public.monitoring_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  target_url text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  execution text NOT NULL,
  required_checks integer NOT NULL,
  available_checks integer,
  journey_id uuid REFERENCES public.journey_definitions (id) ON DELETE SET NULL,
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monitoring_runs_execution_chk CHECK (execution IN ('executed', 'not_executed')),
  CONSTRAINT monitoring_runs_required_chk CHECK (required_checks >= 0),
  CONSTRAINT monitoring_runs_url_len CHECK (char_length(trim(target_url)) BETWEEN 8 AND 500)
);

CREATE TABLE IF NOT EXISTS public.monitoring_run_observations (
  monitoring_run_id uuid NOT NULL REFERENCES public.monitoring_runs (id) ON DELETE CASCADE,
  observation_id uuid NOT NULL REFERENCES public.observations (id) ON DELETE CASCADE,
  region text NOT NULL,
  PRIMARY KEY (monitoring_run_id, observation_id)
);

CREATE TABLE IF NOT EXISTS public.monitoring_run_journey_runs (
  monitoring_run_id uuid NOT NULL REFERENCES public.monitoring_runs (id) ON DELETE CASCADE,
  journey_run_id uuid NOT NULL REFERENCES public.journey_runs (id) ON DELETE CASCADE,
  PRIMARY KEY (monitoring_run_id, journey_run_id)
);

CREATE INDEX IF NOT EXISTS monitoring_runs_user_started_idx
  ON public.monitoring_runs (user_id, started_at DESC);

ALTER TABLE public.monitoring_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_run_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_run_journey_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.monitoring_runs FROM anon;
REVOKE ALL ON TABLE public.monitoring_runs FROM PUBLIC;
REVOKE ALL ON TABLE public.monitoring_run_observations FROM anon;
REVOKE ALL ON TABLE public.monitoring_run_observations FROM PUBLIC;
REVOKE ALL ON TABLE public.monitoring_run_journey_runs FROM anon;
REVOKE ALL ON TABLE public.monitoring_run_journey_runs FROM PUBLIC;

GRANT SELECT, INSERT ON TABLE public.monitoring_runs TO authenticated;
GRANT SELECT, INSERT ON TABLE public.monitoring_run_observations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.monitoring_run_journey_runs TO authenticated;

DROP POLICY IF EXISTS monitoring_runs_select_own ON public.monitoring_runs;
DROP POLICY IF EXISTS monitoring_runs_insert_own ON public.monitoring_runs;
DROP POLICY IF EXISTS monitoring_run_observations_select_own ON public.monitoring_run_observations;
DROP POLICY IF EXISTS monitoring_run_observations_insert_own ON public.monitoring_run_observations;
DROP POLICY IF EXISTS monitoring_run_journey_runs_select_own ON public.monitoring_run_journey_runs;
DROP POLICY IF EXISTS monitoring_run_journey_runs_insert_own ON public.monitoring_run_journey_runs;

CREATE POLICY monitoring_runs_select_own
  ON public.monitoring_runs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY monitoring_runs_insert_own
  ON public.monitoring_runs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY monitoring_run_observations_select_own
  ON public.monitoring_run_observations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.monitoring_runs AS run
      WHERE run.id = monitoring_run_id AND run.user_id = auth.uid()
    )
  );

CREATE POLICY monitoring_run_observations_insert_own
  ON public.monitoring_run_observations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.monitoring_runs AS run
      WHERE run.id = monitoring_run_id AND run.user_id = auth.uid()
    )
  );

CREATE POLICY monitoring_run_journey_runs_select_own
  ON public.monitoring_run_journey_runs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.monitoring_runs AS run
      WHERE run.id = monitoring_run_id AND run.user_id = auth.uid()
    )
  );

CREATE POLICY monitoring_run_journey_runs_insert_own
  ON public.monitoring_run_journey_runs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.monitoring_runs AS run
      WHERE run.id = monitoring_run_id AND run.user_id = auth.uid()
    )
  );
