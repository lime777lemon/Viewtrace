-- Store each account's screenshot window on public.users.
-- Free 30, Starter 90, Pro 365. The app reads this column.
-- Account holders can read it. They cannot change it; plan sync writes it.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS screenshot_retention_days integer;

UPDATE public.users
SET screenshot_retention_days = CASE lower(btrim(plan))
  WHEN 'pro' THEN 365
  WHEN 'starter' THEN 90
  ELSE 30
END
WHERE screenshot_retention_days IS NULL
   OR screenshot_retention_days IS DISTINCT FROM CASE lower(btrim(plan))
     WHEN 'pro' THEN 365
     WHEN 'starter' THEN 90
     ELSE 30
   END;

ALTER TABLE public.users
  ALTER COLUMN screenshot_retention_days SET DEFAULT 30;

ALTER TABLE public.users
  ALTER COLUMN screenshot_retention_days SET NOT NULL;

DO $body$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_screenshot_retention_days_positive'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_screenshot_retention_days_positive
      CHECK (screenshot_retention_days > 0);
  END IF;
END
$body$;

COMMENT ON COLUMN public.users.screenshot_retention_days IS
  'Screenshot file window in days for this account. Free 30, Starter 90, Pro 365. Written by plan sync.';

CREATE OR REPLACE FUNCTION public.keep_screenshot_retention_days()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
    NEW.screenshot_retention_days := OLD.screenshot_retention_days;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_keep_screenshot_retention_days ON public.users;
CREATE TRIGGER users_keep_screenshot_retention_days
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.keep_screenshot_retention_days();
