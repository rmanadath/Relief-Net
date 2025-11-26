-- Complete fix for feedback table RLS policies
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: Check current policies (for reference)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'feedback';

-- Step 2: Drop ALL existing policies on feedback table
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can insert feedback for own requests" ON public.feedback;
DROP POLICY IF EXISTS "Volunteers can insert feedback for assigned requests" ON public.feedback;
DROP POLICY IF EXISTS "Admins can insert feedback for any request" ON public.feedback;
DROP POLICY IF EXISTS "Authenticated users can insert feedback" ON public.feedback;
DROP POLICY IF EXISTS "Allow authenticated feedback insert" ON public.feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;

-- Step 3: Ensure feedback table exists with correct structure
CREATE TABLE IF NOT EXISTS public.feedback (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES public.requests(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  comments TEXT,
  volunteer_id UUID REFERENCES auth.users(id), -- NULLABLE: request owners can submit without volunteer_id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Add missing columns if they don't exist and ensure volunteer_id is nullable
ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS comment TEXT;

ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Add volunteer_id if it doesn't exist (nullable)
ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS volunteer_id UUID REFERENCES auth.users(id);

-- Ensure volunteer_id is nullable (remove NOT NULL constraint if it exists)
ALTER TABLE public.feedback 
ALTER COLUMN volunteer_id DROP NOT NULL;

-- Step 5: Grant permissions
GRANT SELECT, INSERT ON TABLE public.feedback TO anon, authenticated;

-- Step 6: Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Step 7: Create simple, permissive policies

-- Policy 1: Anyone authenticated can INSERT feedback
CREATE POLICY "Allow authenticated feedback insert" ON public.feedback
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Policy 2: Users can view feedback for their own requests
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests 
      WHERE requests.id = feedback.request_id 
      AND requests.user_id = auth.uid()
    )
  );

-- Policy 3: Admins can view all feedback
CREATE POLICY "Admins can view all feedback" ON public.feedback
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Step 8: Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Step 9: Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'feedback'
ORDER BY policyname;

-- Step 10: Test query (should return policies)
SELECT 'RLS policies updated successfully!' as status;

