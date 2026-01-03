-- ============================================
-- Complete Fix for Login Issue
-- Run this entire script in Supabase SQL Editor
-- This will fix all common login problems
-- ============================================

-- Step 1: Enable email confirmation for ALL users
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- Step 2: Enable email confirmation for specific user (double check)
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'yuki.ikeda7887@gmail.com'
  AND email_confirmed_at IS NULL;

-- Step 3: Create missing profile if it doesn't exist
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
  'active' as subscription_status, -- Set to 'active' for local dev
  CASE 
    WHEN au.raw_user_meta_data->>'plan' = 'pro' THEN 200
    ELSE 50
  END as observations_limit,
  0 as observations_used
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'yuki.ikeda7887@gmail.com'
  AND pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 4: Verify the fix
SELECT 
  au.email,
  au.email_confirmed_at,
  au.encrypted_password IS NOT NULL as has_password,
  pu.id IS NOT NULL as has_profile,
  pu.subscription_status,
  CASE 
    WHEN au.email_confirmed_at IS NULL THEN '❌ Email NOT confirmed'
    WHEN au.encrypted_password IS NULL THEN '❌ No password'
    WHEN pu.id IS NULL THEN '❌ No profile'
    ELSE '✅ Ready to login'
  END as final_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'yuki.ikeda7887@gmail.com';


