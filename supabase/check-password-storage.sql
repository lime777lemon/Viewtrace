-- ============================================
-- Check Password Storage in Supabase
-- Run this in Supabase SQL Editor
-- ============================================

-- Note: Passwords are hashed and encrypted for security
-- You cannot see the actual password, but you can verify it exists

-- Step 1: Check if password is stored (hashed)
SELECT 
  id,
  email,
  email_confirmed_at,
  encrypted_password IS NOT NULL as has_password,
  CASE 
    WHEN encrypted_password IS NULL THEN '❌ No password set'
    ELSE '✅ Password is stored (hashed)'
  END as password_status,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'yuki.ikeda7887@gmail.com';

-- Step 2: Check all users' password status
SELECT 
  email,
  encrypted_password IS NOT NULL as has_password,
  email_confirmed_at IS NOT NULL as is_confirmed,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN encrypted_password IS NULL THEN '❌ No password'
    WHEN email_confirmed_at IS NULL THEN '⚠️ Password OK but email not confirmed'
    ELSE '✅ Ready to login'
  END as status
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Summary
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN encrypted_password IS NOT NULL THEN 1 END) as users_with_password,
  COUNT(CASE WHEN encrypted_password IS NULL THEN 1 END) as users_without_password,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users
FROM auth.users;


