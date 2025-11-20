-- Sprint 4: Backend Automation, Feedback, and Analytics
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. FEEDBACK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(request_id, volunteer_id) -- One feedback per volunteer per request
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_request_id ON public.feedback(request_id);
CREATE INDEX IF NOT EXISTS idx_feedback_volunteer_id ON public.feedback(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- ============================================
-- 2. DELIVERY LOG TABLE (for analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS public.delivery_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status_from TEXT NOT NULL,
  status_to TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  metadata JSONB -- Store additional info like location, notes, etc.
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_delivery_logs_request_id ON public.delivery_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_volunteer_id ON public.delivery_logs(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_status_to ON public.delivery_logs(status_to);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_changed_at ON public.delivery_logs(changed_at DESC);

-- ============================================
-- 3. ERROR LOG TABLE (for error tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type TEXT NOT NULL, -- 'maps_api', 'supabase_write', 'route_optimization', etc.
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB, -- Additional context like request_id, user_id, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Index for error tracking
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);

-- ============================================
-- 4. NORMALIZE STATUS VALUES (handle case sensitivity)
-- ============================================
-- Update existing status values to lowercase to match app expectations
UPDATE public.requests 
SET status = LOWER(status)
WHERE status != LOWER(status);

-- Update default status to lowercase
ALTER TABLE public.requests 
ALTER COLUMN status SET DEFAULT 'pending';

-- ============================================
-- 4b. UPDATE PROFILES ROLE CONSTRAINT (add 'volunteer' if needed)
-- ============================================
-- Check if 'volunteer' role is allowed in profiles table
DO $$
BEGIN
  -- Drop existing constraint if it doesn't include 'volunteer'
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  END IF;
  
  -- Add new constraint with 'volunteer' role
  ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('user', 'admin', 'volunteer'));
END $$;

-- ============================================
-- 5. ADD COMPLETION TIMESTAMPS TO REQUESTS
-- ============================================
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_requests_completed_at ON public.requests(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requests_delivered_at ON public.requests(delivered_at) WHERE delivered_at IS NOT NULL;

-- ============================================
-- 6. TRIGGER: Auto-log status changes
-- ============================================
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.delivery_logs (
      request_id,
      volunteer_id,
      status_from,
      status_to,
      changed_at,
      changed_by,
      metadata
    ) VALUES (
      NEW.id,
      COALESCE(NEW.assigned_to, auth.uid()),
      COALESCE(LOWER(OLD.status), 'pending'),
      LOWER(NEW.status),
      NOW(),
      auth.uid(),
      jsonb_build_object(
        'priority', NEW.priority,
        'aid_type', NEW.aid_type,
        'location', NEW.location
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_log_status_change ON public.requests;
CREATE TRIGGER trigger_log_status_change
  AFTER UPDATE OF status ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_status_change();

-- ============================================
-- 7. TRIGGER: Auto-update timestamps on status change
-- ============================================
CREATE OR REPLACE FUNCTION public.update_request_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize status to lowercase (handle case variations)
  NEW.status = LOWER(NEW.status);
  
  -- Update timestamps based on status
  IF NEW.status = 'in-progress' AND (OLD.status IS NULL OR LOWER(OLD.status) != 'in-progress') THEN
    NEW.started_at = COALESCE(NEW.started_at, NOW());
  END IF;
  
  IF NEW.status IN ('resolved', 'fulfilled') AND (OLD.status IS NULL OR LOWER(OLD.status) NOT IN ('resolved', 'fulfilled')) THEN
    NEW.completed_at = COALESCE(NEW.completed_at, NOW());
  END IF;
  
  IF NEW.status = 'fulfilled' AND (OLD.status IS NULL OR LOWER(OLD.status) != 'fulfilled') THEN
    NEW.delivered_at = COALESCE(NEW.delivered_at, NOW());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_timestamps ON public.requests;
CREATE TRIGGER trigger_update_timestamps
  BEFORE UPDATE OF status ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_request_timestamps();

-- ============================================
-- 8. FUNCTION: Log errors
-- ============================================
CREATE OR REPLACE FUNCTION public.log_error(
  p_error_type TEXT,
  p_error_message TEXT,
  p_error_stack TEXT DEFAULT NULL,
  p_context JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_error_id UUID;
BEGIN
  INSERT INTO public.error_logs (
    error_type,
    error_message,
    error_stack,
    context
  ) VALUES (
    p_error_type,
    p_error_message,
    p_error_stack,
    p_context
  ) RETURNING id INTO v_error_id;
  
  RETURN v_error_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. FUNCTION: Get delivery analytics
-- ============================================
CREATE OR REPLACE FUNCTION public.get_delivery_analytics(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  total_requests BIGINT,
  completed_requests BIGINT,
  fulfilled_requests BIGINT,
  completion_rate DECIMAL,
  avg_response_time_hours DECIMAL,
  avg_completion_time_hours DECIMAL,
  requests_by_priority JSONB,
  requests_by_aid_type JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE created_at BETWEEN p_start_date AND p_end_date) as total,
      COUNT(*) FILTER (WHERE status = 'resolved' AND completed_at BETWEEN p_start_date AND p_end_date) as completed,
      COUNT(*) FILTER (WHERE status = 'fulfilled' AND delivered_at BETWEEN p_start_date AND p_end_date) as fulfilled,
      AVG(EXTRACT(EPOCH FROM (started_at - created_at)) / 3600) FILTER (WHERE started_at IS NOT NULL) as avg_response,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600) FILTER (WHERE completed_at IS NOT NULL AND started_at IS NOT NULL) as avg_completion
    FROM public.requests
    WHERE created_at BETWEEN p_start_date AND p_end_date
  ),
  priority_stats AS (
    SELECT jsonb_object_agg(priority, count) as priority_json
    FROM (
      SELECT priority, COUNT(*) as count
      FROM public.requests
      WHERE created_at BETWEEN p_start_date AND p_end_date
      GROUP BY priority
    ) sub
  ),
  type_stats AS (
    SELECT jsonb_object_agg(aid_type, count) as type_json
    FROM (
      SELECT aid_type, COUNT(*) as count
      FROM public.requests
      WHERE created_at BETWEEN p_start_date AND p_end_date
      GROUP BY aid_type
    ) sub
  )
  SELECT 
    stats.total,
    stats.completed,
    stats.fulfilled,
    CASE WHEN stats.total > 0 THEN (stats.completed::DECIMAL / stats.total * 100) ELSE 0 END,
    COALESCE(stats.avg_response, 0),
    COALESCE(stats.avg_completion, 0),
    COALESCE(priority_stats.priority_json, '{}'::jsonb),
    COALESCE(type_stats.type_json, '{}'::jsonb)
  FROM stats
  CROSS JOIN priority_stats
  CROSS JOIN type_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Feedback policies
DROP POLICY IF EXISTS "Users can view feedback for their requests" ON public.feedback;
CREATE POLICY "Users can view feedback for their requests" ON public.feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requests 
      WHERE requests.id = feedback.request_id 
      AND requests.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Volunteers can create feedback" ON public.feedback;
CREATE POLICY "Volunteers can create feedback" ON public.feedback
  FOR INSERT WITH CHECK (auth.uid() = volunteer_id);

DROP POLICY IF EXISTS "Volunteers can update their own feedback" ON public.feedback;
CREATE POLICY "Volunteers can update their own feedback" ON public.feedback
  FOR UPDATE USING (auth.uid() = volunteer_id);

-- Delivery logs policies (admins can see all, users see their own)
DROP POLICY IF EXISTS "Admins can view all delivery logs" ON public.delivery_logs;
CREATE POLICY "Admins can view all delivery logs" ON public.delivery_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view logs for their requests" ON public.delivery_logs;
CREATE POLICY "Users can view logs for their requests" ON public.delivery_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requests 
      WHERE requests.id = delivery_logs.request_id 
      AND requests.user_id = auth.uid()
    )
  );

-- Error logs policies (admins only)
DROP POLICY IF EXISTS "Admins can view error logs" ON public.error_logs;
CREATE POLICY "Admins can view error logs" ON public.error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 11. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE ON public.feedback TO authenticated;
GRANT SELECT ON public.delivery_logs TO authenticated;
GRANT SELECT ON public.error_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_error TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_delivery_analytics TO authenticated;

