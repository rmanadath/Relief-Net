import { supabase } from '../supabase'
import { optimizeRoute } from '../utils/routeOptimizer'
import { logSupabaseError, logMapsApiError, logRouteOptimizationError } from './errorLogger'

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
    // Validate inputs
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid coordinates provided')
    }

    // Try to use the database function first
    try {
      const { data, error } = await supabase.rpc('get_nearby_requests', {
        center_lat: lat,
        center_lng: lng,
        max_distance_km: maxDistance,
        request_status: 'pending'
      })

      if (!error && data) {
        return data
      }

      // If function doesn't exist or has errors, fallback
      if (error) {
        console.warn('Database function error:', error.message || error.code)
        const errorMsg = error.message?.toLowerCase() || ''
        if (error.code === '42883' || 
            errorMsg.includes('does not exist') || 
            errorMsg.includes('structure of query') ||
            errorMsg.includes('result type') ||
            errorMsg.includes('function result')) {
          console.warn('Database function get_nearby_requests not available. Using fallback method.')
        }
      }
    } catch (rpcError) {
      console.warn('RPC call failed, using fallback:', rpcError.message)
    }

    // Fallback: Fetch all pending requests and filter client-side
    console.log('Using client-side filtering fallback')
    const fallbackData = await getPendingRequestsWithLocation()
    return filterByDistance(fallbackData, lat, lng, maxDistance)
    
  } catch (error) {
    console.error('Error in getNearbyRequests:', error.message || error)
    // Try fallback
    try {
      const fallbackData = await getPendingRequestsWithLocation()
      return filterByDistance(fallbackData, lat, lng, maxDistance)
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError)
      return []
    }
  }
}

/**
 * Filter requests by distance (client-side fallback)
 */
function filterByDistance(requests, centerLat, centerLng, maxDistance) {
  const R = 6371 // Earth's radius in km
  
  return requests
    .filter(req => req.latitude && req.longitude)
    .map(req => {
      const lat1 = parseFloat(centerLat)
      const lon1 = parseFloat(centerLng)
      const lat2 = parseFloat(req.latitude)
      const lon2 = parseFloat(req.longitude)
      
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      const distance = R * c
      
      return { ...req, distance_km: distance }
    })
    .filter(req => req.distance_km <= maxDistance)
    .sort((a, b) => a.distance_km - b.distance_km)
}

/**
 * Fallback: Get all pending requests with location
 */
async function getPendingRequestsWithLocation() {
  // Try 'pending' first, but also check 'open' status
  let { data, error } = await supabase
    .from('requests')
    .select('*')
    .in('status', ['pending', 'open'])
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)

  if (error) {
    await logSupabaseError(error, {
      operation: 'get_pending_requests_with_location'
    })
    console.error('Error fetching pending requests:', error)
    return []
  }

  return data || []
}

/**
 * Geocode existing requests that don't have coordinates
 */
export async function geocodeExistingRequests() {
  try {
    // Get all requests without coordinates (don't filter by status - geocode all)
    const { data: requests, error } = await supabase
      .from('requests')
      .select('id, location, address, latitude, longitude')
      .or('latitude.is.null,longitude.is.null')

    if (error) {
      console.error('Error fetching requests:', error)
      return { success: false, message: error.message }
    }

    if (!requests || requests.length === 0) {
      return { success: true, message: 'All requests already have coordinates', geocoded: 0 }
    }

    let geocodedCount = 0
    const errors = []
    const results = []

    // Geocode each request
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i]
      const address = request.address || request.location
      if (!address) {
        errors.push(`Request ${request.id} has no address`)
        continue
      }

      try {
        console.log(`Geocoding ${i + 1}/${requests.length}: "${address}"`)
        
        const geocoded = await geocodeAddress(address)
        if (geocoded.lat && geocoded.lng) {
          const { error: updateError } = await supabase
            .from('requests')
            .update({
              latitude: geocoded.lat,
              longitude: geocoded.lng,
              address: address
            })
            .eq('id', request.id)

          if (!updateError) {
            geocodedCount++
            console.log(`✓ Successfully geocoded: "${address}" → ${geocoded.lat}, ${geocoded.lng}`)
            results.push(`✓ ${address}`)
          } else {
            const errorMsg = `Failed to update request ${request.id}: ${updateError.message}`
            console.error(errorMsg)
            errors.push(errorMsg)
          }
        } else {
          const errorMsg = `Could not geocode: "${address}" - API returned no coordinates`
          console.warn(errorMsg)
          errors.push(errorMsg)
        }

        // Rate limit: wait 1.1 seconds between requests (Nominatim requirement is 1/sec)
        if (i < requests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100))
        }
      } catch (err) {
        const errorMsg = `Error geocoding "${address}": ${err.message}`
        console.error(errorMsg, err)
        errors.push(errorMsg)
        // Still wait to respect rate limit
        if (i < requests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100))
        }
      }
    }

    console.log(`Geocoding complete: ${geocodedCount}/${requests.length} successful`)
    if (errors.length > 0) {
      console.warn('Geocoding errors:', errors)
    }

    return {
      success: true,
      message: geocodedCount > 0 
        ? `Successfully added location data to ${geocodedCount} out of ${requests.length} request(s)`
        : `Could not geocode any requests. Check console for details.`,
      geocoded: geocodedCount,
      total: requests.length,
      errors: errors.length > 0 ? errors.slice(0, 3) : undefined // Show first 3 errors
    }
  } catch (error) {
    console.error('Error in geocodeExistingRequests:', error)
    return { success: false, message: error.message }
  }
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
    // If coordinates not provided but address is, try to geocode
    let finalLat = lat
    let finalLng = lng
    
    if ((!lat || !lng) && location) {
      console.log('Geocoding volunteer address:', location)
      const geocoded = await geocodeAddress(location)
      if (geocoded.lat && geocoded.lng) {
        finalLat = geocoded.lat
        finalLng = geocoded.lng
        console.log('Geocoded to:', finalLat, finalLng)
      } else {
        console.warn('Could not geocode address:', location)
        // Try geocoding with just city/zip if full address fails
        const addressParts = location.split(',').map(s => s.trim())
        if (addressParts.length > 1) {
          // Try with just the city/state/zip part
          const cityStateZip = addressParts.slice(-1)[0] // Last part (e.g., "NY 11203")
          console.log('Trying fallback geocoding with:', cityStateZip)
          const fallbackGeocoded = await geocodeAddress(cityStateZip)
          if (fallbackGeocoded.lat && fallbackGeocoded.lng) {
            finalLat = fallbackGeocoded.lat
            finalLng = fallbackGeocoded.lng
            console.log('Fallback geocoded to:', finalLat, finalLng)
          } else {
            // Return error object instead of false to provide more info
            return { success: false, error: `Could not find coordinates for "${location}". The specific street address may not be in our database. Try using just the city and zip code (e.g., "Brooklyn, NY 11203") or a nearby landmark.` }
          }
        } else {
          return { success: false, error: `Could not find coordinates for "${location}". Please try a more specific address (e.g., include city and state).` }
        }
      }
    }

    const { error } = await supabase.rpc('update_volunteer_location', {
      volunteer_id: userId,
      new_location: location,
      new_lat: finalLat,
      new_lng: finalLng
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
          volunteer_latitude: finalLat,
          volunteer_longitude: finalLng
        })
        .eq('id', userId)

      if (updateError) {
        await logSupabaseError(updateError, {
          operation: 'update_volunteer_location_fallback',
          userId,
          location
        })
        console.error('Error updating volunteer location:', updateError)
        return { success: false, error: updateError.message || 'Failed to save location to database' }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in updateVolunteerLocation:', error)
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

/**
 * Create optimized route for volunteer
 * @param {string} volunteerId - Volunteer user ID
 * @param {Array} requestIds - Array of request IDs to include
 * @param {Object} startLocation - Starting location {lat, lng}
 * @param {string} method - Optimization method ('nearest', 'openrouteservice', 'googlemaps' - optional)
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
    let optimizedRoute
    try {
      optimizedRoute = await optimizeRoute(validRequests, startLocation, method)
    } catch (error) {
      // Log Maps API errors specifically
      if (error.apiError && error.apiType) {
        await logMapsApiError(error, {
          volunteerId,
          requestIds,
          method,
          apiType: error.apiType,
          statusCode: error.statusCode,
          requestCount: validRequests.length
        })
      } else {
        // Log other route optimization errors
        await logRouteOptimizationError(error, {
          volunteerId,
          requestIds,
          method,
          requestCount: validRequests.length
        })
      }
      throw error
    }

    // Validate optimized route structure
    if (!optimizedRoute || !optimizedRoute.requests || !Array.isArray(optimizedRoute.requests)) {
      throw new Error('Route optimization returned invalid data structure')
    }

    if (optimizedRoute.requests.length === 0) {
      throw new Error('Route optimization returned no requests')
    }

    // Ensure distance and duration are valid numbers
    const distance = optimizedRoute.distance != null ? parseFloat(optimizedRoute.distance) : 0
    const duration = optimizedRoute.duration != null ? Math.round(parseFloat(optimizedRoute.duration)) : 0

    // Validate that we have a valid route (distance > 0)
    if (distance <= 0 || isNaN(distance)) {
      throw new Error('Route optimization returned invalid distance. Please ensure all requests have valid coordinates.')
    }

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
        total_distance: distance,
        total_duration: duration,
        request_order: requestOrder,
        route_waypoints: routeWaypoints,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      await logSupabaseError(insertError, {
        operation: 'create_optimized_route',
        volunteerId,
        requestIds
      })
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
    await logSupabaseError(error, {
      operation: 'get_volunteer_routes',
      volunteerId
    })
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
    await logSupabaseError(error, {
      operation: 'update_route_status',
      routeId,
      status
    })
    console.error('Error updating route status:', error)
    return false
  }

  return true
}

/**
 * Geocode address to coordinates using OpenStreetMap Nominatim (free, no API key needed)
 * @param {string} address - Address string
 * @returns {Promise<Object>} {lat, lng} coordinates or null if not found
 */
export async function geocodeAddress(address) {
  if (!address || !address.trim()) {
    return { lat: null, lng: null }
  }

  try {
    // Use OpenStreetMap Nominatim API (free, no API key required)
    // Rate limit: 1 request per second
    const encodedAddress = encodeURIComponent(address.trim())
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ReliefNet/1.0' // Required by Nominatim
      }
    })

    if (!response.ok) {
      console.warn('Geocoding API error:', response.status)
      return { lat: null, lng: null }
    }

    const data = await response.json()
    
    if (data && data.length > 0) {
      const result = data[0]
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      }
    }

    return { lat: null, lng: null }
  } catch (error) {
    console.error('Error geocoding address:', error)
    return { lat: null, lng: null }
  }
}

/**
 * Reverse geocode coordinates to address using OpenStreetMap Nominatim (free, no API key needed)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} {address} address string or null if not found
 */
export async function reverseGeocode(lat, lng) {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return { address: null }
  }

  try {
    // Use OpenStreetMap Nominatim Reverse Geocoding API (free, no API key required)
    // Rate limit: 1 request per second
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ReliefNet/1.0' // Required by Nominatim
      }
    })

    if (!response.ok) {
      console.warn('Reverse geocoding API error:', response.status)
      return { address: null }
    }

    const data = await response.json()
    
    if (data && data.address) {
      // Build address string from components
      const addr = data.address
      const addressParts = []
      
      // Try to build a readable address
      if (addr.house_number && addr.road) {
        addressParts.push(`${addr.house_number} ${addr.road}`)
      } else if (addr.road) {
        addressParts.push(addr.road)
      }
      
      if (addr.city) {
        addressParts.push(addr.city)
      } else if (addr.town) {
        addressParts.push(addr.town)
      } else if (addr.village) {
        addressParts.push(addr.village)
      }
      
      if (addr.state) {
        addressParts.push(addr.state)
      }
      
      if (addr.postcode) {
        addressParts.push(addr.postcode)
      }
      
      const address = addressParts.length > 0 
        ? addressParts.join(', ')
        : data.display_name || `${lat}, ${lng}`
      
      return { address }
    }

    return { address: data.display_name || null }
  } catch (error) {
    console.error('Error reverse geocoding coordinates:', error)
    return { address: null }
  }
}
