-- Fix admin role for achamma@charlotte.edu
-- Run this in Supabase SQL Editor

-- Step 1: Check if user exists
DO $$
DECLARE
  user_id_val UUID;
BEGIN
  -- Get user ID
  SELECT id INTO user_id_val
  FROM auth.users
  WHERE email = 'achamma@charlotte.edu';
  
  IF user_id_val IS NULL THEN
    RAISE NOTICE 'User achamma@charlotte.edu not found in auth.users';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found user ID: %', user_id_val;
  
  -- Step 2: Delete existing profile if it exists (to force recreation)
  DELETE FROM public.profiles WHERE id = user_id_val;
  RAISE NOTICE 'Deleted existing profile (if any)';
  
  -- Step 3: Create profile with admin role
  INSERT INTO public.profiles (id, role, created_at)
  VALUES (user_id_val, 'admin', NOW())
  ON CONFLICT (id) DO UPDATE SET role = 'admin';
  
  RAISE NOTICE 'Created/Updated profile with admin role';
END $$;

-- Step 4: Verify the update
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.role,
  p.created_at as profile_created,
  p.updated_at as profile_updated,
  CASE 
    WHEN p.role = 'admin' THEN '✓ Admin role set correctly'
    WHEN p.role IS NULL THEN '✗ Profile does not exist'
    ELSE '✗ Role is: ' || p.role
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'achamma@charlotte.edu';

-- If still not working, try this direct update (bypasses RLS):
-- UPDATE public.profiles SET role = 'admin' 
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'achamma@charlotte.edu');

