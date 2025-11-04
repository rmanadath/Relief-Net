import { supabase } from '../supabase'
import { optimizeRoute } from '../utils/routeOptimizer'

/**
 * Route Optimization Service
 * Handles database operations and route optimization
 */

/**
 * Get nearby pending requests for route optimization
 * @param {number} lat - Volunteer latitude
 * @param {number} lng - Volunteer longitude
 * @param {number} maxDistance - Maximum distance in km (default: 50)
 * @returns {Promise<Array>} Array of nearby requests
 */
export async function getNearbyRequests(lat, lng, maxDistance = 50) {
  try {
    // Use the database function to get nearby requests
    const { data, error } = await supabase.rpc('get_nearby_requests', {
      center_lat: lat,
      center_lng: lng,
      max_distance_km: maxDistance,
      request_status: 'pending'
    })

    if (error) {
      // If function doesn't exist, fallback to client-side filtering
      if (error.code === '42883' || error.message?.includes('does not exist')) {
        console.warn('Database function get_nearby_requests not found. Using fallback method.')
        console.warn('Please run sprint3-database-enhancements.sql in Supabase SQL Editor')
        return await getPendingRequestsWithLocation()
      }
      console.error('Error fetching nearby requests:', error)
      // Fallback: Fetch all pending requests and filter client-side
      return await getPendingRequestsWithLocation()
    }

    return data || []
  } catch (error) {
    console.error('Error in getNearbyRequests:', error)
    return await getPendingRequestsWithLocation()
  }
}

/**
 * Fallback: Get all pending requests with location
 */
async function getPendingRequestsWithLocation() {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('status', 'pending')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)

  if (error) {
    console.error('Error fetching pending requests:', error)
    return []
  }

  return data || []
}

/**
 * Update volunteer location in profile
 * @param {string} userId - User ID
 * @param {string} location - Location address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<boolean>} Success status
 */
export async function updateVolunteerLocation(userId, location, lat, lng) {
  try {
    const { error } = await supabase.rpc('update_volunteer_location', {
      volunteer_id: userId,
      new_location: location,
      new_lat: lat,
      new_lng: lng
    })

    if (error) {
      // If function doesn't exist, use direct update
      if (error.code === '42883' || error.message?.includes('does not exist')) {
        console.warn('Database function update_volunteer_location not found. Using direct update.')
        console.warn('Please run sprint3-database-enhancements.sql in Supabase SQL Editor')
      }
      
      // Fallback: Direct update
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          volunteer_location: location,
          volunteer_latitude: lat,
          volunteer_longitude: lng
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating volunteer location:', updateError)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error in updateVolunteerLocation:', error)
    return false
  }
}

/**
 * Create optimized route for volunteer
 * @param {string} volunteerId - Volunteer user ID
 * @param {Array} requestIds - Array of request IDs to include
 * @param {Object} startLocation - Starting location {lat, lng}
 * @param {string} method - Optimization method ('nearest', 'openrouteservice', 'googlemaps')
 * @returns {Promise<Object>} Optimized route data
 */
export async function createOptimizedRoute(volunteerId, requestIds, startLocation, method = 'nearest') {
  try {
    // Fetch request details
    const { data: requests, error: fetchError } = await supabase
      .from('requests')
      .select('*')
      .in('id', requestIds)
      .eq('status', 'pending')

    if (fetchError || !requests || requests.length === 0) {
      throw new Error('Failed to fetch requests or no pending requests found')
    }

    // Filter requests with valid coordinates
    const validRequests = requests.filter(r => 
      r.latitude && r.longitude && 
      !isNaN(parseFloat(r.latitude)) && 
      !isNaN(parseFloat(r.longitude))
    )

    if (validRequests.length === 0) {
      throw new Error('No requests with valid coordinates found')
    }

    // Optimize route
    const optimizedRoute = await optimizeRoute(validRequests, startLocation, method)

    // Prepare data for database
    const requestOrder = optimizedRoute.requests.map(r => r.id)
    const routeWaypoints = optimizedRoute.requests.map(r => ({
      lat: parseFloat(r.latitude),
      lng: parseFloat(r.longitude),
      request_id: r.id,
      name: r.name,
      location: r.location
    }))

    // Store in database
    const { data: routeData, error: insertError } = await supabase
      .from('optimized_routes')
      .insert({
        volunteer_id: volunteerId,
        total_distance: optimizedRoute.distance,
        total_duration: optimizedRoute.duration,
        request_order: requestOrder,
        route_waypoints: routeWaypoints,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to save route: ${insertError.message}`)
    }

    return {
      routeId: routeData.id,
      requests: optimizedRoute.requests,
      distance: optimizedRoute.distance,
      duration: optimizedRoute.duration,
      waypoints: routeWaypoints
    }
  } catch (error) {
    console.error('Error creating optimized route:', error)
    throw error
  }
}

/**
 * Get optimized routes for volunteer
 * @param {string} volunteerId - Volunteer user ID
 * @returns {Promise<Array>} Array of optimized routes
 */
export async function getVolunteerRoutes(volunteerId) {
  const { data, error } = await supabase
    .from('optimized_routes')
    .select('*')
    .eq('volunteer_id', volunteerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching volunteer routes:', error)
    return []
  }

  return data || []
}

/**
 * Update route status
 * @param {string} routeId - Route ID
 * @param {string} status - New status ('pending', 'active', 'completed', 'cancelled')
 * @returns {Promise<boolean>} Success status
 */
export async function updateRouteStatus(routeId, status) {
  const updateData = { status }
  
  if (status === 'active') {
    updateData.started_at = new Date().toISOString()
  } else if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('optimized_routes')
    .update(updateData)
    .eq('id', routeId)

  if (error) {
    console.error('Error updating route status:', error)
    return false
  }

  return true
}

/**
 * Geocode address to coordinates (using a geocoding service)
 * This is a placeholder - you'll need to implement with a geocoding API
 * Options: Google Geocoding API, OpenCage, Mapbox, etc.
 * @param {string} address - Address string
 * @returns {Promise<Object>} {lat, lng} coordinates
 */
export async function geocodeAddress(address) {
  // Placeholder - implement with your preferred geocoding service
  // For now, returns null - coordinates should be provided by user or frontend
  console.warn('Geocoding not implemented. Please provide coordinates manually or implement a geocoding service.')
  return { lat: null, lng: null }
}
