-- Fix RLS policies for feedback table
-- Run this in Supabase SQL Editor to allow volunteers and admins to submit feedback

-- Drop existing insert policies
DROP POLICY IF EXISTS "Users can insert feedback for own requests" ON public.feedback;
DROP POLICY IF EXISTS "Volunteers can insert feedback for assigned requests" ON public.feedback;
DROP POLICY IF EXISTS "Admins can insert feedback for any request" ON public.feedback;
DROP POLICY IF EXISTS "Authenticated users can insert feedback" ON public.feedback;

-- Single policy: Any authenticated user can insert feedback
-- Application logic controls who can submit (request owners, assigned volunteers, admins)
CREATE POLICY "Authenticated users can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Also update the view policy to allow admins to see all feedback
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;

CREATE POLICY "Admins can view all feedback" ON public.feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'feedback'
ORDER BY policyname;

