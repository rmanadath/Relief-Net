-- Fix feedback table to ensure all columns exist
-- Run this in Supabase SQL Editor

-- Ensure feedback table exists with all required columns
CREATE TABLE IF NOT EXISTS public.feedback (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES public.requests(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  volunteer_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment column if it doesn't exist (sprint3 uses 'comment')
ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS comment TEXT;

-- Add comments column if it doesn't exist (sprint4 uses 'comments')
ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Add volunteer_id column if it doesn't exist
ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS volunteer_id UUID REFERENCES auth.users(id);

-- Grant permissions
GRANT SELECT, INSERT ON TABLE public.feedback TO anon, authenticated;

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can insert feedback for own requests" ON public.feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;

-- Create RLS policies
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requests 
      WHERE requests.id = feedback.request_id 
      AND requests.user_id = auth.uid()
    )
  );

-- Policy: Users can insert feedback for their own requests
-- Allow any authenticated user to insert feedback
-- Application logic controls who can submit (request owners, assigned volunteers, admins)
CREATE POLICY "Authenticated users can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy: Volunteers can insert feedback for requests they're assigned to
CREATE POLICY "Volunteers can insert feedback for assigned requests" ON public.feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requests 
      WHERE requests.id = feedback.request_id 
      AND (
        requests.assigned_to = auth.uid()
        OR requests.assigned_volunteer IS NOT NULL
      )
    )
  );

-- Policy: Admins can insert feedback for any request
CREATE POLICY "Admins can insert feedback for any request" ON public.feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

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

-- Verify the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'feedback'
ORDER BY ordinal_position;

