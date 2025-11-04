-- Sprint 3: Route Optimization Database Enhancements
-- Run this in your Supabase SQL Editor

-- 1. EXTEND REQUESTS TABLE with location fields
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add indexes for geospatial queries
CREATE INDEX IF NOT EXISTS idx_requests_latitude ON public.requests (latitude);
CREATE INDEX IF NOT EXISTS idx_requests_longitude ON public.requests (longitude);
CREATE INDEX IF NOT EXISTS idx_requests_location ON public.requests (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 2. ADD VOLUNTEER LOCATION to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS volunteer_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS volunteer_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS volunteer_location TEXT;

-- Add index for volunteer location queries
CREATE INDEX IF NOT EXISTS idx_profiles_volunteer_location ON public.profiles (volunteer_latitude, volunteer_longitude) 
WHERE volunteer_latitude IS NOT NULL AND volunteer_longitude IS NOT NULL;

-- 3. CREATE ROUTE OPTIMIZATION RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.optimized_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_distance DECIMAL(10, 2), -- in kilometers
  total_duration INTEGER, -- in seconds
  request_order JSONB NOT NULL, -- Array of request IDs in optimal order
  route_waypoints JSONB, -- Array of {lat, lng, request_id} for map display
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_optimized_routes_volunteer ON public.optimized_routes (volunteer_id);
CREATE INDEX IF NOT EXISTS idx_optimized_routes_status ON public.optimized_routes (status);
CREATE INDEX IF NOT EXISTS idx_optimized_routes_created_at ON public.optimized_routes (created_at DESC);

-- 4. CREATE RLS POLICIES for optimized_routes
ALTER TABLE public.optimized_routes ENABLE ROW LEVEL SECURITY;

-- Volunteers can view their own routes
CREATE POLICY "Volunteers can view own routes" ON public.optimized_routes
  FOR SELECT USING (auth.uid() = volunteer_id);

-- Volunteers can create routes
CREATE POLICY "Volunteers can create routes" ON public.optimized_routes
  FOR INSERT WITH CHECK (auth.uid() = volunteer_id);

-- Volunteers can update their own routes
CREATE POLICY "Volunteers can update own routes" ON public.optimized_routes
  FOR UPDATE USING (auth.uid() = volunteer_id);

-- Admins can view all routes
CREATE POLICY "Admins can view all routes" ON public.optimized_routes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 5. CREATE FUNCTION to get nearby requests (for route optimization)
CREATE OR REPLACE FUNCTION public.get_nearby_requests(
  center_lat DECIMAL,
  center_lng DECIMAL,
  max_distance_km DECIMAL DEFAULT 50,
  request_status TEXT DEFAULT 'pending'
)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  location TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  aid_type TEXT,
  priority TEXT,
  distance_km DECIMAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.location,
    r.latitude,
    r.longitude,
    r.aid_type,
    r.priority,
    -- Calculate distance using Haversine formula
    (
      6371 * acos(
        cos(radians(center_lat)) * 
        cos(radians(r.latitude)) * 
        cos(radians(r.longitude) - radians(center_lng)) + 
        sin(radians(center_lat)) * 
        sin(radians(r.latitude))
      )
    ) AS distance_km
  FROM public.requests r
  WHERE 
    r.status = request_status
    AND r.latitude IS NOT NULL 
    AND r.longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(center_lat)) * 
        cos(radians(r.latitude)) * 
        cos(radians(r.longitude) - radians(center_lng)) + 
        sin(radians(center_lat)) * 
        sin(radians(r.latitude))
      )
    ) <= max_distance_km
  ORDER BY distance_km ASC;
END;
$$;

-- 6. CREATE FUNCTION to update request location from address (helper function)
-- This can be called when a request is created/updated to geocode the address
CREATE OR REPLACE FUNCTION public.update_request_coordinates(
  request_id INTEGER,
  new_address TEXT,
  new_lat DECIMAL DEFAULT NULL,
  new_lng DECIMAL DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.requests
  SET 
    address = new_address,
    latitude = COALESCE(new_lat, latitude),
    longitude = COALESCE(new_lng, longitude)
  WHERE id = request_id;
END;
$$;

-- 7. CREATE FUNCTION to update volunteer location
CREATE OR REPLACE FUNCTION public.update_volunteer_location(
  volunteer_id UUID,
  new_location TEXT,
  new_lat DECIMAL,
  new_lng DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    volunteer_location = new_location,
    volunteer_latitude = new_lat,
    volunteer_longitude = new_lng
  WHERE id = volunteer_id;
END;
$$;
