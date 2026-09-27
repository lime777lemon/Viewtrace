-- Mirror public.users.observations_limit to src/lib/plans.ts
-- (starter 500, pro 1500). Display-only; capture gating uses getPlan().

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
    RAISE NOTICE 'viewtrace: public.users.plan missing — skip observations_limit align';
    RETURN;
  END IF;

  UPDATE public.users u
  SET observations_limit = CASE lower(btrim(u.plan::text))
    WHEN 'pro' THEN 1500
    WHEN 'starter' THEN 500
    WHEN 'freeplan' THEN 20
    ELSE observations_limit
  END
  WHERE lower(btrim(u.plan::text)) IN ('pro', 'starter', 'freeplan');

  RAISE NOTICE 'viewtrace: aligned observations_limit to 500 / 1500 / 20';
END
$body$;
