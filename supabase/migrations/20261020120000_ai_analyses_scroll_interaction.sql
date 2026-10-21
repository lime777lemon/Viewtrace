-- Regional Interaction Check. Same Observation. Not a screenshot. Detected is not Working.

ALTER TABLE public.ai_analyses DROP CONSTRAINT IF EXISTS ai_analyses_type_ok;
ALTER TABLE public.ai_analyses
  ADD CONSTRAINT ai_analyses_type_ok
  CHECK (analysis_type IN (
    'page_audit',
    'lab_cwv',
    'subpage_scores',
    'field_cwv',
    'synthetic_interaction',
    'scroll_interaction'
  ));
