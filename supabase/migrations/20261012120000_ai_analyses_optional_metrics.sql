-- Optional lab CWV / subpage scores. Not Observation evidence. Same table as page audit.

ALTER TABLE public.ai_analyses DROP CONSTRAINT IF EXISTS ai_analyses_type_ok;
ALTER TABLE public.ai_analyses
  ADD CONSTRAINT ai_analyses_type_ok
  CHECK (analysis_type IN ('page_audit', 'lab_cwv', 'subpage_scores'));

COMMENT ON TABLE public.ai_analyses IS
  'Page audit and in-plan optional metrics on an existing Observation. Not Observed. Capture conditions stay immutable.';
