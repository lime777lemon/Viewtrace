-- Check if users exist and passwords are set in Supabase Auth
-- Run this in Supabase SQL Editor

-- Note: Passwords are hashed and cannot be viewed directly for security reasons
-- This query checks if users exist and can login

-- Check all users status
SELECT 
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  encrypted_password IS NOT NULL as has_password,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN encrypted_password IS NULL THEN '❌ No password'
    WHEN email_confirmed_at IS NULL THEN '⚠️ Password OK but email not confirmed'
    ELSE '✅ Ready to login'
  END as status
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- Summary
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN encrypted_password IS NOT NULL THEN 1 END) as users_with_password,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users,
  COUNT(CASE WHEN encrypted_password IS NOT NULL AND email_confirmed_at IS NOT NULL THEN 1 END) as ready_to_login
FROM auth.users;

