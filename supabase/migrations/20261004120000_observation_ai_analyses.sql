-- Page audit (AI / record). Not Observation evidence. RLS: owner only.

CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  observation_id uuid NOT NULL REFERENCES public.observations (id) ON DELETE CASCADE,
  analysis_type text NOT NULL DEFAULT 'page_audit',
  status text NOT NULL DEFAULT 'completed',
  source text NOT NULL DEFAULT 'record',
  summary text,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  prompt_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_analyses_type_ok CHECK (analysis_type IN ('page_audit')),
  CONSTRAINT ai_analyses_status_ok CHECK (status IN ('completed', 'failed')),
  CONSTRAINT ai_analyses_source_ok CHECK (source IN ('record', 'ai')),
  CONSTRAINT ai_analyses_notes_arr CHECK (jsonb_typeof(notes) = 'array'),
  CONSTRAINT ai_analyses_unique_obs UNIQUE (user_id, observation_id, analysis_type)
);

COMMENT ON TABLE public.ai_analyses IS
  'Page audit on an existing Observation. Labeled inference, not Observed. No extra capture.';

ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_analyses FROM anon;
REVOKE ALL ON TABLE public.ai_analyses FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_analyses TO authenticated;

DROP POLICY IF EXISTS ai_analyses_select_own ON public.ai_analyses;
DROP POLICY IF EXISTS ai_analyses_insert_own ON public.ai_analyses;
DROP POLICY IF EXISTS ai_analyses_update_own ON public.ai_analyses;
DROP POLICY IF EXISTS ai_analyses_delete_own ON public.ai_analyses;

CREATE POLICY ai_analyses_select_own
  ON public.ai_analyses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY ai_analyses_insert_own
  ON public.ai_analyses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY ai_analyses_update_own
  ON public.ai_analyses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY ai_analyses_delete_own
  ON public.ai_analyses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ai_analyses_observation_idx
  ON public.ai_analyses (observation_id, created_at DESC);
