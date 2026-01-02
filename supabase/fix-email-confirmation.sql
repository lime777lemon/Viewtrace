-- ============================================
-- Fix Email Confirmation Issue
-- Run this in Supabase SQL Editor
-- Enables email confirmation for all users so they can login
-- ============================================

-- Enable email confirmation for ALL users
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- Verify: Check all users status
SELECT 
  COUNT(*) as total_users,
  COUNT(email_confirmed_at) as confirmed_users,
  COUNT(*) - COUNT(email_confirmed_at) as unconfirmed_users,
  CASE 
    WHEN COUNT(*) - COUNT(email_confirmed_at) = 0 THEN '✅ All users can login'
    ELSE '⚠️ Some users still need confirmation'
  END as status
FROM auth.users;

