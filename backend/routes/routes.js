/**
 * Route Optimization API Routes
 * Handles route optimization requests
 */

import express from 'express';
import { authenticate } from '../utils/auth.js';
import { supabase, createUserSupabaseClient } from '../server.js';
import { optimizeRoute } from '../utils/routeOptimizer.js';

const router = express.Router();

/**
 * POST /api/routes/optimize
 * Optimize a route for a volunteer
 * Requires authentication
 */
router.post('/optimize', authenticate, async (req, res, next) => {
  try {
    const { requestIds, startLocation, method = 'nearest' } = req.body;
    const volunteerId = req.userId;

    // Validate inputs
    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ error: 'requestIds must be a non-empty array' });
    }

    if (!startLocation || !startLocation.lat || !startLocation.lng) {
      return res.status(400).json({ error: 'startLocation must have lat and lng' });
    }

    // Fetch request details from database
    const { data: requests, error: fetchError } = await supabase
      .from('requests')
      .select('*')
      .in('id', requestIds)
      .eq('status', 'pending');

    if (fetchError) {
      console.error('Error fetching requests:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch requests' });
    }

    if (!requests || requests.length === 0) {
      return res.status(404).json({ error: 'No pending requests found' });
    }

    // Filter requests with valid coordinates
    const validRequests = requests.filter(r => 
      r.latitude && r.longitude && 
      !isNaN(parseFloat(r.latitude)) && 
      !isNaN(parseFloat(r.longitude))
    );

    if (validRequests.length === 0) {
      return res.status(400).json({ error: 'No requests with valid coordinates found' });
    }

    // Optimize route
    let optimizedRoute;
    try {
      optimizedRoute = await optimizeRoute(validRequests, startLocation, method);
    } catch (error) {
      console.error('Route optimization error:', error);
      return res.status(500).json({ 
        error: 'Route optimization failed',
        message: error.message 
      });
    }

    // Validate optimized route structure
    if (!optimizedRoute || !optimizedRoute.requests || !Array.isArray(optimizedRoute.requests)) {
      return res.status(500).json({ error: 'Route optimization returned invalid data structure' });
    }

    if (optimizedRoute.requests.length === 0) {
      return res.status(500).json({ error: 'Route optimization returned no requests' });
    }

    // Ensure distance and duration are valid numbers
    const distance = optimizedRoute.distance != null ? parseFloat(optimizedRoute.distance) : 0;
    const duration = optimizedRoute.duration != null ? Math.round(parseFloat(optimizedRoute.duration)) : 0;

    // Validate that we have a valid route (distance > 0)
    if (distance <= 0 || isNaN(distance)) {
      return res.status(400).json({ 
        error: 'Route optimization returned invalid distance. Please ensure all requests have valid coordinates.' 
      });
    }

    // Prepare data for database
    const requestOrder = optimizedRoute.requests.map(r => r.id);
    const routeWaypoints = optimizedRoute.requests.map(r => ({
      lat: parseFloat(r.latitude),
      lng: parseFloat(r.longitude),
      request_id: r.id,
      name: r.name,
      location: r.location
    }));

    // Store in database
    // Note: Using service role key since we've already authenticated the user
    // The volunteer_id matches the authenticated user, so this is secure
    const { data: routeData, error: insertError } = await supabase
      .from('optimized_routes')
      .insert({
        volunteer_id: volunteerId,
        total_distance: distance,
        total_duration: duration,
        request_order: requestOrder,
        route_waypoints: routeWaypoints,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving route:', insertError);
      return res.status(500).json({ 
        error: 'Failed to save route',
        message: insertError.message 
      });
    }

    // Return optimized route
    res.json({
      routeId: routeData.id,
      requests: optimizedRoute.requests,
      distance: distance,
      duration: duration,
      waypoints: routeWaypoints,
      route: routeData
    });

  } catch (error) {
    console.error('Unexpected error in route optimization:', error);
    next(error);
  }
});

/**
 * GET /api/routes/nearby
 * Get nearby requests for route optimization
 * Requires authentication
 */
router.get('/nearby', authenticate, async (req, res, next) => {
  try {
    const { lat, lng, maxDistance = 50 } = req.query;

    // Validate inputs
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxDist = parseFloat(maxDistance);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Valid lat and lng query parameters required' });
    }

    // Try to use the database function first
    try {
      const { data, error } = await supabase.rpc('get_nearby_requests', {
        center_lat: latitude,
        center_lng: longitude,
        max_distance_km: maxDist,
        request_status: 'pending'
      });

      if (!error && data) {
        return res.json(data);
      }

      // Fallback if function doesn't exist
      if (error) {
        console.warn('Database function error, using fallback:', error.message);
      }
    } catch (rpcError) {
      console.warn('RPC call failed, using fallback:', rpcError.message);
    }

    // Fallback: Fetch all pending requests and filter client-side
    const { data: allRequests, error: fetchError } = await supabase
      .from('requests')
      .select('*')
      .in('status', ['pending', 'open'])
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (fetchError) {
      return res.status(500).json({ error: 'Failed to fetch requests' });
    }

    // Filter by distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const nearbyRequests = (allRequests || [])
      .map(req => {
        const lat1 = latitude * Math.PI / 180;
        const lon1 = longitude * Math.PI / 180;
        const lat2 = parseFloat(req.latitude) * Math.PI / 180;
        const lon2 = parseFloat(req.longitude) * Math.PI / 180;
        
        const dLat = lat2 - lat1;
        const dLon = lon2 - lon1;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return { ...req, distance_km: distance };
      })
      .filter(req => req.distance_km <= maxDist)
      .sort((a, b) => a.distance_km - b.distance_km);

    res.json(nearbyRequests);

  } catch (error) {
    console.error('Error getting nearby requests:', error);
    next(error);
  }
});

/**
 * GET /api/routes/my-routes
 * Get all routes for the authenticated volunteer
 */
router.get('/my-routes', authenticate, async (req, res, next) => {
  try {
    // Get routes for authenticated user
    // Using service role key with explicit volunteer_id filter (already authenticated)
    const { data, error } = await supabase
      .from('optimized_routes')
      .select('*')
      .eq('volunteer_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching routes:', error);
      return res.status(500).json({ error: 'Failed to fetch routes' });
    }

    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

export default router;

