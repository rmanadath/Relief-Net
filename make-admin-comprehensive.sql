-- Comprehensive admin setup for achamma@charlotte.edu
-- This will create the profile if it doesn't exist, or update it if it does

-- First, check if user exists
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'achamma@charlotte.edu';

-- Step 1: Ensure profile exists (create if missing)
INSERT INTO public.profiles (id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'achamma@charlotte.edu'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.users.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Update role to admin (even if profile already exists)
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'achamma@charlotte.edu'
);

-- Step 3: Verify everything
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.role,
  p.created_at as profile_created,
  p.updated_at as profile_updated
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'achamma@charlotte.edu';

-- If the above shows NULL for role, the profile doesn't exist
-- Run this to force create it:
-- INSERT INTO public.profiles (id, role)
-- SELECT id, 'admin' FROM auth.users WHERE email = 'achamma@charlotte.edu'
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

