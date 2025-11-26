-- Make user admin by email
-- Run this in Supabase SQL Editor

-- Update the user's role to admin
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'achamma@charlotte.edu'
);

-- Verify the update
SELECT 
  u.email,
  p.role,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'achamma@charlotte.edu';

