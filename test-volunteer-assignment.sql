-- Test script to verify volunteer assignment works
-- Run this in Supabase SQL Editor to check the current state

-- 1. Check current status of Sarah Johnson's request
SELECT 
  id,
  name,
  status,
  assigned_volunteer,
  assigned_to,
  priority
FROM requests
WHERE name = 'Sarah Johnson'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Try manual update to see if it works
-- (Replace REQUEST_ID with actual ID from query above)
-- UPDATE requests 
-- SET assigned_volunteer = 'Test Volunteer', status = 'in-progress'
-- WHERE id = REQUEST_ID
-- RETURNING *;

-- 3. Check what status values are allowed
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%status%';

-- 4. Check RLS policies on requests table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'requests';

