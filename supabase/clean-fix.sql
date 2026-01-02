-- ============================================
-- Clean Fix: Search Path + Email Confirmation
-- Run this entire script in Supabase SQL Editor
-- Fixes security warning and enables login for all users
-- ============================================

-- Part 1: Fix search_path security warning
-- Drop existing triggers first (if they exist)
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_observations_updated_at ON public.observations;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;

-- Drop and recreate the function with secure search_path
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

-- Recreate triggers
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_observations_updated_at 
  BEFORE UPDATE ON public.observations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Part 2: Enable email confirmation for all existing users
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- Part 3: Verify - Check all users status
SELECT 
  COUNT(*) as total_users,
  COUNT(email_confirmed_at) as confirmed_users,
  COUNT(*) - COUNT(email_confirmed_at) as unconfirmed_users,
  CASE 
    WHEN COUNT(*) - COUNT(email_confirmed_at) = 0 THEN '✅ All users can login'
    ELSE '⚠️ Some users still need confirmation'
  END as status
FROM auth.users;

