-- Add assigned_volunteer column to requests table
-- This script ensures the column exists and refreshes Supabase's schema cache

-- Add the column if it doesn't exist
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS assigned_volunteer TEXT;

-- Verify the column was added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'requests' 
    AND column_name = 'assigned_volunteer'
  ) THEN
    RAISE EXCEPTION 'Column assigned_volunteer was not created successfully';
  END IF;
END $$;

-- Force Supabase PostgREST to reload the schema cache
-- This is critical for the API to recognize the new column
NOTIFY pgrst, 'reload schema';

-- Alternative method: Refresh schema via Supabase API
-- (This is handled automatically by NOTIFY, but included for reference)

-- Success message
SELECT 'Column assigned_volunteer added successfully. Schema cache refreshed.' as result;

