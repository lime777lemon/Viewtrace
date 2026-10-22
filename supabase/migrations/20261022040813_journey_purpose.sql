-- Journey purpose separates production watches from development rows.
-- The list shows production by default and folds test and fixture under Development.

ALTER TABLE public.journey_definitions
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'production';

ALTER TABLE public.journey_definitions
  DROP CONSTRAINT IF EXISTS journey_definitions_purpose_chk;

ALTER TABLE public.journey_definitions
  ADD CONSTRAINT journey_definitions_purpose_chk
  CHECK (purpose IN ('production', 'test', 'fixture'));

UPDATE public.journey_definitions
SET purpose = 'fixture'
WHERE name ILIKE '%fixture%';

UPDATE public.journey_definitions
SET purpose = 'test'
WHERE name IN ('Monitoring proof', 'Journey', 'viewtrace.net');
