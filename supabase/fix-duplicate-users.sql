-- ============================================
-- Fix Duplicate Users Issue
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check for orphaned users (in auth.users but not in public.users)
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at as auth_created_at,
  pu.id as profile_id,
  CASE 
    WHEN pu.id IS NULL THEN '❌ No profile in public.users'
    ELSE '✅ Profile exists'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 20;

-- Step 2: Check for duplicate emails in auth.users
SELECT 
  email,
  COUNT(*) as count,
  array_agg(id::text) as user_ids,
  array_agg(email_confirmed_at::text) as confirmation_statuses
FROM auth.users
GROUP BY email
HAVING COUNT(*) > 1;

-- Step 3: Delete duplicate users (keep the most recent one)
-- ⚠️ WARNING: This will delete duplicate users. Review the results from Step 2 first!
-- Uncomment and modify the email address below if you need to clean up duplicates

/*
-- Example: Delete older duplicate user for a specific email
-- Replace 'your-email@example.com' with the actual email
DELETE FROM auth.users
WHERE email = 'your-email@example.com'
  AND id NOT IN (
    SELECT id FROM auth.users 
    WHERE email = 'your-email@example.com' 
    ORDER BY created_at DESC 
    LIMIT 1
  );
*/

-- Step 4: Create missing profiles for users in auth.users but not in public.users
-- This will create profiles for users who exist in auth.users but not in public.users
-- Note: subscription_status is set to 'active' for local development
-- Change to 'inactive' if you want to require Stripe payment first
INSERT INTO public.users (
  id,
  email,
  name,
  plan,
  billing_period,
  subscription_status,
  observations_limit,
  observations_used
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  COALESCE(au.raw_user_meta_data->>'plan', 'starter') as plan,
  COALESCE(au.raw_user_meta_data->>'billing', 'monthly') as billing_period,
  'active' as subscription_status, -- Set to 'active' for local dev, or 'inactive' for production
  CASE 
    WHEN au.raw_user_meta_data->>'plan' = 'pro' THEN 200
    ELSE 50
  END as observations_limit,
  0 as observations_used
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 5: Verify the fix
SELECT 
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_profiles,
  COUNT(*) - (SELECT COUNT(*) FROM public.users) as missing_profiles
FROM auth.users;

