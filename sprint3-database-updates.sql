-- Sprint 3 Database Updates
-- Add new columns for route optimization and volunteer assignment

-- Add assigned_volunteer column to requests table
-- Use public schema explicitly for Supabase
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS assigned_volunteer TEXT,
ADD COLUMN IF NOT EXISTS route_order INTEGER;

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions for feedback table
GRANT SELECT, INSERT ON TABLE feedback TO anon, authenticated;

-- Enable RLS for feedback
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create feedback policies
CREATE POLICY "Users can view own feedback" ON feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM requests 
      WHERE requests.id = feedback.request_id 
      AND requests.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert feedback for own requests" ON feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM requests 
      WHERE requests.id = feedback.request_id 
      AND requests.user_id = auth.uid()
    )
  );

-- Create analytics view (optional - for better performance)
CREATE OR REPLACE VIEW request_analytics AS
SELECT 
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'open') as open_requests,
  COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress_requests,
  COUNT(*) FILTER (WHERE status = 'fulfilled') as fulfilled_requests,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_requests,
  AVG(rating) as avg_feedback_rating
FROM requests
LEFT JOIN feedback ON requests.id = feedback.request_id;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

