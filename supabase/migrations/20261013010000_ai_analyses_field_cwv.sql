-- Field CWV (CrUX). Not Observation evidence. Lab CWV stays a separate analysis_type.

ALTER TABLE public.ai_analyses DROP CONSTRAINT IF EXISTS ai_analyses_type_ok;
ALTER TABLE public.ai_analyses
  ADD CONSTRAINT ai_analyses_type_ok
  CHECK (analysis_type IN ('page_audit', 'lab_cwv', 'subpage_scores', 'field_cwv'));

COMMENT ON TABLE public.ai_analyses IS
  'Page audit and in-plan optional metrics on an existing Observation. Lab CWV and Field CWV (CrUX) are separate. Not Observed. Capture conditions stay immutable.';
