-- Synthetic interaction test. Not Field INP. Not Observation evidence.

ALTER TABLE public.ai_analyses DROP CONSTRAINT IF EXISTS ai_analyses_type_ok;
ALTER TABLE public.ai_analyses
  ADD CONSTRAINT ai_analyses_type_ok
  CHECK (analysis_type IN (
    'page_audit',
    'lab_cwv',
    'subpage_scores',
    'field_cwv',
    'synthetic_interaction'
  ));

COMMENT ON TABLE public.ai_analyses IS
  'Page audit and in-plan optional metrics on an existing Observation. Lab CWV, Field CWV (CrUX), and synthetic interaction are separate. Synthetic is not Field INP. Not Observed. Capture conditions stay immutable.';
