-- Test Scripts for Enhanced Database Schema
-- Run these in Supabase SQL Editor to verify functionality

-- 1. TEST INSERTING REQUEST WITH NEW COLUMNS
INSERT INTO public.requests (
  user_id,
  name,
  contact,
  aid_type,
  description,
  location,
  status,
  priority,
  assigned_to
) VALUES (
  auth.uid(), -- Current user
  'John Doe',
  'john@example.com',
  'food',
  'Need emergency food assistance for family of 4',
  'New York, NY',
  'pending',
  'high',
  NULL -- Not assigned yet
);

-- 2. TEST UPDATING REQUEST STATUS AND ASSIGNMENT
UPDATE public.requests 
SET 
  status = 'in-progress',
  assigned_to = auth.uid(),
  priority = 'urgent'
WHERE id = (
  SELECT id FROM public.requests 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- 3. TEST FILTERING BY STATUS
SELECT 
  id,
  name,
  aid_type,
  status,
  priority,
  assigned_to,
  created_at
FROM public.requests 
WHERE status = 'pending'
ORDER BY priority DESC, created_at ASC;

-- 4. TEST FILTERING BY PRIORITY
SELECT 
  id,
  name,
  aid_type,
  status,
  priority,
  location
FROM public.requests 
WHERE priority IN ('high', 'urgent')
ORDER BY 
  CASE priority 
    WHEN 'urgent' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    WHEN 'low' THEN 4 
  END;

-- 5. TEST FILTERING BY ASSIGNED VOLUNTEER
SELECT 
  r.id,
  r.name,
  r.aid_type,
  r.status,
  r.priority,
  p.full_name as assigned_volunteer
FROM public.requests r
LEFT JOIN public.profiles p ON r.assigned_to = p.id
WHERE r.assigned_to IS NOT NULL
ORDER BY r.created_at DESC;

-- 6. TEST USER ROLE FUNCTIONALITY
-- Check current user's role
SELECT 
  p.role,
  p.full_name,
  p.organization
FROM public.profiles p
WHERE p.id = auth.uid();

-- 7. TEST ADMIN ACCESS (if you're an admin)
SELECT 
  COUNT(*) as total_requests,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
FROM public.requests;

-- 8. TEST VOLUNTEER ASSIGNMENT
-- Find requests assigned to current user
SELECT 
  r.id,
  r.name,
  r.aid_type,
  r.description,
  r.location,
  r.status,
  r.priority,
  r.created_at
FROM public.requests r
WHERE r.assigned_to = auth.uid()
ORDER BY r.priority DESC, r.created_at ASC;

-- 9. TEST COMPLEX QUERIES
-- Dashboard query for volunteers
SELECT 
  r.id,
  r.name,
  r.aid_type,
  r.status,
  r.priority,
  r.location,
  r.created_at,
  CASE 
    WHEN r.assigned_to IS NULL THEN 'Unassigned'
    ELSE p.full_name
  END as assigned_to_name
FROM public.requests r
LEFT JOIN public.profiles p ON r.assigned_to = p.id
WHERE r.status IN ('pending', 'in-progress')
ORDER BY 
  CASE r.priority 
    WHEN 'urgent' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    WHEN 'low' THEN 4 
  END,
  r.created_at ASC;

-- 10. TEST DATA INTEGRITY
-- Verify all constraints are working
SELECT 
  'Status Check' as test_name,
  COUNT(*) as total,
  COUNT(CASE WHEN status IN ('pending', 'in-progress', 'resolved', 'cancelled') THEN 1 END) as valid_status
FROM public.requests

UNION ALL

SELECT 
  'Priority Check' as test_name,
  COUNT(*) as total,
  COUNT(CASE WHEN priority IN ('low', 'medium', 'high', 'urgent') THEN 1 END) as valid_priority
FROM public.requests

UNION ALL

SELECT 
  'Role Check' as test_name,
  COUNT(*) as total,
  COUNT(CASE WHEN role IN ('user', 'admin', 'volunteer') THEN 1 END) as valid_roles
FROM public.profiles;
