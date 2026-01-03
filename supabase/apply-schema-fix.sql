-- ============================================
-- Apply Schema Fix: Update function with secure search_path
-- Run this in Supabase SQL Editor
-- Safe to run even if tables already exist
-- ============================================

-- Step 1: Drop existing triggers (if they exist)
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_observations_updated_at ON public.observations;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;

-- Step 2: Drop and recreate the function with secure search_path
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog'
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;

-- Step 3: Recreate triggers with public. prefix
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_observations_updated_at 
  BEFORE UPDATE ON public.observations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 4: Verify the function was created correctly
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as search_path_config
FROM pg_proc
WHERE proname = 'update_updated_at_column'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Step 5: Verify triggers were created
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as is_enabled
FROM pg_trigger
WHERE tgname IN (
  'update_users_updated_at',
  'update_observations_updated_at',
  'update_subscriptions_updated_at'
)
ORDER BY tgname;


