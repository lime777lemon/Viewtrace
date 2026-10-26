-- Mirror freeplan observations_limit to TRIAL_CONFIG.freeObservations (50).
-- Display-only; trial gating uses src/lib/plans.ts TRIAL_CONFIG.

DO $body$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE NOTICE 'viewtrace: public.users missing — skip freeplan limit 50';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'observations_limit'
  ) THEN
    RAISE NOTICE 'viewtrace: public.users.observations_limit missing — skip';
    RETURN;
  END IF;

  ALTER TABLE public.users ALTER COLUMN observations_limit SET DEFAULT 50;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'plan'
  ) THEN
    UPDATE public.users
    SET observations_limit = 50
    WHERE lower(btrim(plan::text)) = 'freeplan'
      AND observations_limit IS DISTINCT FROM 50;
  END IF;

  RAISE NOTICE 'viewtrace: freeplan observations_limit mirror set to 50';
END
$body$;
