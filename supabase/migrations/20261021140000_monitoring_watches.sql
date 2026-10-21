-- Monitoring Watch is the schedule. A due watch becomes one Monitoring Run.
-- Observation rows and Journey Run rows stay separate children of that run.

CREATE TABLE IF NOT EXISTS public.monitoring_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  target_url text NOT NULL,
  include_page boolean NOT NULL DEFAULT false,
  regions text[] NOT NULL,
  environments text[] NOT NULL,
  schedule text NOT NULL DEFAULT 'daily',
  enabled boolean NOT NULL DEFAULT false,
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monitoring_watches_schedule_chk CHECK (schedule IN ('daily', 'weekly')),
  CONSTRAINT monitoring_watches_url_len CHECK (char_length(trim(target_url)) BETWEEN 8 AND 500),
  CONSTRAINT monitoring_watches_regions_chk CHECK (cardinality(regions) BETWEEN 1 AND 4),
  CONSTRAINT monitoring_watches_environments_chk CHECK (cardinality(environments) BETWEEN 1 AND 2),
  CONSTRAINT monitoring_watches_env_values_chk CHECK (environments <@ ARRAY['desktop', 'mobile']::text[])
);

CREATE TABLE IF NOT EXISTS public.monitoring_watch_journeys (
  monitoring_watch_id uuid NOT NULL REFERENCES public.monitoring_watches (id) ON DELETE CASCADE,
  journey_id uuid NOT NULL REFERENCES public.journey_definitions (id) ON DELETE CASCADE,
  PRIMARY KEY (monitoring_watch_id, journey_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS monitoring_watch_journeys_journey_idx
  ON public.monitoring_watch_journeys (journey_id);

CREATE INDEX IF NOT EXISTS monitoring_watches_due_idx
  ON public.monitoring_watches (enabled, next_run_at)
  WHERE enabled = true;

ALTER TABLE public.monitoring_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_watch_journeys ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.monitoring_watches FROM anon;
REVOKE ALL ON TABLE public.monitoring_watches FROM PUBLIC;
REVOKE ALL ON TABLE public.monitoring_watch_journeys FROM anon;
REVOKE ALL ON TABLE public.monitoring_watch_journeys FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.monitoring_watches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.monitoring_watch_journeys TO authenticated;

DROP POLICY IF EXISTS monitoring_watches_select_own ON public.monitoring_watches;
DROP POLICY IF EXISTS monitoring_watches_insert_own ON public.monitoring_watches;
DROP POLICY IF EXISTS monitoring_watches_update_own ON public.monitoring_watches;
DROP POLICY IF EXISTS monitoring_watches_delete_own ON public.monitoring_watches;
DROP POLICY IF EXISTS monitoring_watch_journeys_select_own ON public.monitoring_watch_journeys;
DROP POLICY IF EXISTS monitoring_watch_journeys_insert_own ON public.monitoring_watch_journeys;
DROP POLICY IF EXISTS monitoring_watch_journeys_delete_own ON public.monitoring_watch_journeys;

CREATE POLICY monitoring_watches_select_own
  ON public.monitoring_watches FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY monitoring_watches_insert_own
  ON public.monitoring_watches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY monitoring_watches_update_own
  ON public.monitoring_watches FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY monitoring_watches_delete_own
  ON public.monitoring_watches FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY monitoring_watch_journeys_select_own
  ON public.monitoring_watch_journeys FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.monitoring_watches AS watch
      WHERE watch.id = monitoring_watch_id AND watch.user_id = auth.uid()
    )
  );

CREATE POLICY monitoring_watch_journeys_insert_own
  ON public.monitoring_watch_journeys FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.monitoring_watches AS watch
      WHERE watch.id = monitoring_watch_id AND watch.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.journey_definitions AS journey
      WHERE journey.id = journey_id AND journey.user_id = auth.uid()
    )
  );

CREATE POLICY monitoring_watch_journeys_delete_own
  ON public.monitoring_watch_journeys FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.monitoring_watches AS watch
      WHERE watch.id = monitoring_watch_id AND watch.user_id = auth.uid()
    )
  );
