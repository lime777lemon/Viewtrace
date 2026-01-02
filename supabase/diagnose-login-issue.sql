-- ============================================
-- Diagnose Login Issue
-- Run this in Supabase SQL Editor to check why login is failing
-- ============================================

-- Step 1: Check user status in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  encrypted_password IS NOT NULL as has_password,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ Email NOT confirmed - login will fail'
    WHEN encrypted_password IS NULL THEN '❌ No password set'
    ELSE '✅ Ready to login'
  END as login_status
FROM auth.users
WHERE email = 'yuki.ikeda7887@gmail.com';

-- Step 2: Check if profile exists in public.users
SELECT 
  u.id,
  u.email,
  u.name,
  u.subscription_status,
  u.observations_limit,
  CASE 
    WHEN u.id IS NULL THEN '❌ No profile in public.users'
    ELSE '✅ Profile exists'
  END as profile_status
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE au.email = 'yuki.ikeda7887@gmail.com';

-- Step 3: Check all users summary
SELECT 
  COUNT(*) as total_auth_users,
  COUNT(email_confirmed_at) as confirmed_users,
  COUNT(*) - COUNT(email_confirmed_at) as unconfirmed_users,
  COUNT(CASE WHEN encrypted_password IS NULL THEN 1 END) as users_without_password
FROM auth.users;

-- Step 4: Check for duplicate emails
SELECT 
  email,
  COUNT(*) as count,
  array_agg(id::text) as user_ids
FROM auth.users
WHERE email = 'yuki.ikeda7887@gmail.com'
GROUP BY email
HAVING COUNT(*) > 1;

