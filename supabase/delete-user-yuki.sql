-- ============================================
-- Delete User: yuki.ikeda7887@gmail.com
-- Run this in Supabase SQL Editor
-- ⚠️ WARNING: This will permanently delete the user and all related data
-- ============================================

-- Step 1: Check what will be deleted
SELECT 
  'auth.users' as table_name,
  COUNT(*) as records
FROM auth.users
WHERE email = 'yuki.ikeda7887@gmail.com'

UNION ALL

SELECT 
  'public.users' as table_name,
  COUNT(*) as records
FROM public.users u
JOIN auth.users au ON u.id = au.id
WHERE au.email = 'yuki.ikeda7887@gmail.com'

UNION ALL

SELECT 
  'public.observations' as table_name,
  COUNT(*) as records
FROM public.observations o
JOIN auth.users au ON o.user_id = au.id
WHERE au.email = 'yuki.ikeda7887@gmail.com'

UNION ALL

SELECT 
  'public.subscriptions' as table_name,
  COUNT(*) as records
FROM public.subscriptions s
JOIN auth.users au ON s.user_id = au.id
WHERE au.email = 'yuki.ikeda7887@gmail.com';

-- Step 2: Delete the user (CASCADE will delete related records)
-- This will delete:
-- - auth.users (user account)
-- - public.users (user profile - CASCADE)
-- - public.observations (user observations - CASCADE)
-- - public.subscriptions (user subscriptions - CASCADE)
DELETE FROM auth.users WHERE email = 'yuki.ikeda7887@gmail.com';

-- Step 3: Verify deletion
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ User deleted successfully'
    ELSE '❌ User still exists'
  END as deletion_status
FROM auth.users
WHERE email = 'yuki.ikeda7887@gmail.com';

