-- Sprint 3: Route Optimization Test Queries
-- Run these in Supabase SQL Editor to test the functionality

-- 1. TEST: Update request with coordinates
UPDATE public.requests
SET 
  latitude = 40.7128,
  longitude = -74.0060,
  address = 'New York, NY'
WHERE id = (SELECT id FROM public.requests LIMIT 1);

-- 2. TEST: Add multiple requests with coordinates (sample NYC locations)
INSERT INTO public.requests (
  user_id, name, contact, aid_type, description, location, 
  latitude, longitude, address, status, priority
) VALUES
  (auth.uid(), 'Test Request 1', 'test1@example.com', 'food', 
   'Need food assistance', 'Manhattan, NY', 40.7128, -74.0060, 'Manhattan, NY', 'pending', 'high'),
  (auth.uid(), 'Test Request 2', 'test2@example.com', 'medicine', 
   'Need medicine', 'Brooklyn, NY', 40.6782, -73.9442, 'Brooklyn, NY', 'pending', 'medium'),
  (auth.uid(), 'Test Request 3', 'test3@example.com', 'shelter', 
   'Need shelter', 'Queens, NY', 40.7282, -73.7949, 'Queens, NY', 'pending', 'high');

-- 3. TEST: Update volunteer location
SELECT update_volunteer_location(
  auth.uid(),
  'Central Park, New York, NY',
  40.7829,
  -73.9654
);

-- 4. TEST: Get nearby requests (within 50km of Central Park)
SELECT * FROM get_nearby_requests(
  40.7829,  -- Central Park latitude
  -73.9654, -- Central Park longitude
  50,       -- 50km radius
  'pending' -- status
);

-- 5. TEST: Create optimized route (manually)
INSERT INTO public.optimized_routes (
  volunteer_id,
  total_distance,
  total_duration,
  request_order,
  route_waypoints,
  status
) VALUES (
  auth.uid(),
  25.5, -- km
  1800, -- seconds (30 minutes)
  '[1, 2, 3]'::jsonb,
  '[
    {"lat": 40.7128, "lng": -74.0060, "request_id": 1, "name": "Test Request 1"},
    {"lat": 40.6782, "lng": -73.9442, "request_id": 2, "name": "Test Request 2"},
    {"lat": 40.7282, "lng": -73.7949, "request_id": 3, "name": "Test Request 3"}
  ]'::jsonb,
  'pending'
);

-- 6. TEST: View all optimized routes for current user
SELECT 
  id,
  total_distance,
  total_duration,
  request_order,
  status,
  created_at
FROM public.optimized_routes
WHERE volunteer_id = auth.uid()
ORDER BY created_at DESC;

-- 7. TEST: Update route status
UPDATE public.optimized_routes
SET 
  status = 'active',
  started_at = NOW()
WHERE id = (SELECT id FROM public.optimized_routes WHERE volunteer_id = auth.uid() LIMIT 1);

-- 8. TEST: Get requests with coordinates
SELECT 
  id,
  name,
  location,
  latitude,
  longitude,
  address,
  status,
  priority
FROM public.requests
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL
  AND status = 'pending'
ORDER BY created_at DESC;

-- 9. TEST: Calculate distance between two points (Haversine formula)
-- This is what the get_nearby_requests function uses internally
SELECT 
  id,
  name,
  location,
  6371 * acos(
    cos(radians(40.7829)) * 
    cos(radians(latitude)) * 
    cos(radians(longitude) - radians(-73.9654)) + 
    sin(radians(40.7829)) * 
    sin(radians(latitude))
  ) AS distance_km
FROM public.requests
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL
ORDER BY distance_km ASC;

-- 10. TEST: Verify schema changes
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'requests' 
  AND column_name IN ('latitude', 'longitude', 'address')
ORDER BY ordinal_position;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name IN ('volunteer_location', 'volunteer_latitude', 'volunteer_longitude')
ORDER BY ordinal_position;

-- 11. TEST: Check optimized_routes table exists
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'optimized_routes'
ORDER BY ordinal_position;

-- 12. TEST: Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('optimized_routes', 'requests', 'profiles')
ORDER BY tablename, policyname;
