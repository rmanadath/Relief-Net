/**
 * Route Optimization Service
 * Uses OpenRouteService (free) or Google Maps Directions API
 * 
 * This service implements the Traveling Salesman Problem (TSP) solution
 * to find the optimal route for delivering aid to multiple locations.
 */

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees) {
  return degrees * (Math.PI / 180)
}

/**
 * Simple Nearest Neighbor algorithm for route optimization
 * This is a greedy algorithm that finds a good (not always optimal) solution
 * @param {Array} requests - Array of requests with lat/lng
 * @param {Object} startLocation - Starting location {lat, lng}
 * @returns {Array} Optimized order of requests
 */
export function optimizeRouteNearestNeighbor(requests, startLocation) {
  if (!requests || requests.length === 0) return []
  
  // Filter requests with valid coordinates
  const validRequests = requests.filter(r => 
    r.latitude && r.longitude && 
    !isNaN(parseFloat(r.latitude)) && 
    !isNaN(parseFloat(r.longitude))
  )
  
  if (validRequests.length === 0) return []
  
  const result = []
  const visited = new Set()
  let currentLocation = { lat: startLocation.lat, lng: startLocation.lng }
  
  // Find nearest unvisited request until all are visited
  while (visited.size < validRequests.length) {
    let nearest = null
    let nearestDistance = Infinity
    
    validRequests.forEach((request, index) => {
      if (!visited.has(index)) {
        const distance = calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          parseFloat(request.latitude),
          parseFloat(request.longitude)
        )
        
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearest = { request, index, distance }
        }
      }
    })
    
    if (nearest) {
      result.push({
        ...nearest.request,
        distanceFromPrevious: nearestDistance
      })
      visited.add(nearest.index)
      currentLocation = {
        lat: parseFloat(nearest.request.latitude),
        lng: parseFloat(nearest.request.longitude)
      }
    }
  }
  
  return result
}

/**
 * Optimize route using OpenRouteService API
 * Requires OPENROUTESERVICE_API_KEY in environment
 * @param {Array} requests - Array of requests with lat/lng
 * @param {Object} startLocation - Starting location {lat, lng}
 * @returns {Promise<Object>} Optimized route with distance and duration
 */
export async function optimizeRouteWithOpenRouteService(requests, startLocation) {
  const API_KEY = process.env.REACT_APP_OPENROUTESERVICE_API_KEY || ''
  
  if (!API_KEY) {
    console.warn('OpenRouteService API key not found, falling back to Nearest Neighbor algorithm')
    return optimizeRouteNearestNeighbor(requests, startLocation)
  }
  
  // Build coordinates array: [start, ...requests, start] (round trip)
  const coordinates = [
    [startLocation.lng, startLocation.lat], // Start
    ...requests
      .filter(r => r.latitude && r.longitude)
      .map(r => [parseFloat(r.longitude), parseFloat(r.latitude)]),
    [startLocation.lng, startLocation.lat] // Return to start
  ]
  
  try {
    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      body: JSON.stringify({
        coordinates: coordinates,
        format: 'json',
        geometry: true
      })
    })
    
    if (!response.ok) {
      throw new Error(`OpenRouteService API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Extract optimized order from the response
    // OpenRouteService returns the route in optimal order
    const route = data.routes[0]
    const optimizedOrder = route.geometry.coordinates.map((coord, index) => {
      if (index === 0 || index === coordinates.length - 1) return null // Skip start/end
      return requests[index - 1] // Map back to original requests
    }).filter(Boolean)
    
    return {
      requests: optimizedOrder,
      distance: route.summary.distance / 1000, // Convert to km
      duration: route.summary.duration, // in seconds
      geometry: route.geometry
    }
  } catch (error) {
    console.error('OpenRouteService optimization failed:', error)
    // Fallback to Nearest Neighbor
    return optimizeRouteNearestNeighbor(requests, startLocation)
  }
}

/**
 * Optimize route using Google Maps Directions API
 * Requires REACT_APP_GOOGLE_MAPS_API_KEY in environment
 * @param {Array} requests - Array of requests with lat/lng
 * @param {Object} startLocation - Starting location {lat, lng}
 * @returns {Promise<Object>} Optimized route with distance and duration
 */
export async function optimizeRouteWithGoogleMaps(requests, startLocation) {
  const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''
  
  if (!API_KEY) {
    console.warn('Google Maps API key not found, falling back to Nearest Neighbor algorithm')
    return optimizeRouteNearestNeighbor(requests, startLocation)
  }
  
  // Build waypoints (excluding start/end)
  const waypoints = requests
    .filter(r => r.latitude && r.longitude)
    .map(r => `${r.latitude},${r.longitude}`)
    .join('|')
  
  const origin = `${startLocation.lat},${startLocation.lng}`
  const destination = origin // Return to start
  
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:true|${waypoints}&key=${API_KEY}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${data.status}`)
    }
    
    const route = data.routes[0]
    const optimizedWaypointOrder = route.waypoint_order
    
    // Reorder requests based on optimized waypoint order
    const optimizedRequests = optimizedWaypointOrder.map(index => requests[index])
    
    // Calculate total distance and duration
    let totalDistance = 0
    let totalDuration = 0
    
    route.legs.forEach(leg => {
      totalDistance += leg.distance.value / 1000 // Convert to km
      totalDuration += leg.duration.value // in seconds
    })
    
    return {
      requests: optimizedRequests,
      distance: totalDistance,
      duration: totalDuration,
      waypointOrder: optimizedWaypointOrder
    }
  } catch (error) {
    console.error('Google Maps optimization failed:', error)
    // Fallback to Nearest Neighbor
    return optimizeRouteNearestNeighbor(requests, startLocation)
  }
}

/**
 * Main route optimization function
 * Automatically chooses the best available method
 * @param {Array} requests - Array of requests with lat/lng
 * @param {Object} startLocation - Starting location {lat, lng}
 * @param {string} method - 'openrouteservice', 'googlemaps', or 'nearest' (default)
 * @returns {Promise<Object>} Optimized route
 */
export async function optimizeRoute(requests, startLocation, method = 'nearest') {
  switch (method) {
    case 'openrouteservice':
      return await optimizeRouteWithOpenRouteService(requests, startLocation)
    case 'googlemaps':
      return await optimizeRouteWithGoogleMaps(requests, startLocation)
    case 'nearest':
    default:
      const optimizedRequests = optimizeRouteNearestNeighbor(requests, startLocation)
      // Calculate total distance for nearest neighbor
      let totalDistance = 0
      let currentLoc = startLocation
      
      optimizedRequests.forEach((request, index) => {
        if (index > 0) {
          const prevRequest = optimizedRequests[index - 1]
          totalDistance += calculateDistance(
            parseFloat(prevRequest.latitude),
            parseFloat(prevRequest.longitude),
            parseFloat(request.latitude),
            parseFloat(request.longitude)
          )
        } else {
          totalDistance += calculateDistance(
            currentLoc.lat,
            currentLoc.lng,
            parseFloat(request.latitude),
            parseFloat(request.longitude)
          )
        }
      })
      
      return {
        requests: optimizedRequests,
        distance: totalDistance,
        duration: totalDistance * 60 // Estimate: 1 km = 1 minute
      }
  }
}
