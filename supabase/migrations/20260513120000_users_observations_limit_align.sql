-- Align public.users.observations_limit with app billing (src/lib/plans.ts):
--   starter: 80, pro: 250, freeplan: 80 (same as PLANS.freeplan.monthlyObservations).
-- Safe no-op if public.users or columns are missing.

DO $body$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE NOTICE 'viewtrace: public.users missing — skip observations_limit align';
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

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'plan'
  ) THEN
    RAISE NOTICE 'viewtrace: public.users.plan missing — cannot align observations_limit automatically';
    RETURN;
  END IF;

  UPDATE public.users u
  SET observations_limit = CASE lower(btrim(u.plan::text))
    WHEN 'pro' THEN 250
    WHEN 'starter' THEN 80
    WHEN 'freeplan' THEN 80
    ELSE 80
  END;

  RAISE NOTICE 'viewtrace: updated public.users.observations_limit from plan column';
END
$body$;
