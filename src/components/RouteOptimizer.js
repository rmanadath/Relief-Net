import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { 
  updateVolunteerLocation,
  geocodeExistingRequests,
  geocodeAddress,
  reverseGeocode,
  getNearbyRequests as getNearbyRequestsSupabase
} from '../services/routeService'
// Backend API functions for route optimization
import {
  optimizeRoute as optimizeRouteAPI,
  getNearbyRequests as getNearbyRequestsAPI,
  getVolunteerRoutes as getVolunteerRoutesAPI
} from '../services/backendApi'

export default function RouteOptimizer({ user }) {
  const [volunteerLocation, setVolunteerLocation] = useState({
    address: '',
    lat: '',
    lng: ''
  })
  const [nearbyRequests, setNearbyRequests] = useState([])
  const [selectedRequests, setSelectedRequests] = useState([])
  const [optimizedRoute, setOptimizedRoute] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [myRoutes, setMyRoutes] = useState([])
  const [optimizationMethod, setOptimizationMethod] = useState('nearest')

  useEffect(() => {
    // Load volunteer's saved location
    loadVolunteerLocation()
    // Load volunteer's previous routes (lazy load - not critical for initial render)
    // Delay this slightly to improve initial page load
    const timer = setTimeout(() => {
      loadMyRoutes()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [user])

  const loadVolunteerLocation = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('volunteer_location, volunteer_latitude, volunteer_longitude')
      .eq('id', user.id)
      .single()

    if (data) {
      setVolunteerLocation({
        address: data.volunteer_location || '',
        lat: data.volunteer_latitude || '',
        lng: data.volunteer_longitude || ''
      })
    }
  }

  const loadMyRoutes = async () => {
    try {
      const routes = await getVolunteerRoutesAPI()
      setMyRoutes(routes || [])
    } catch (error) {
      console.error('Error loading routes:', error)
      // Don't block UI if routes fail to load
      setMyRoutes([])
    }
  }

  const handleSaveLocation = async () => {
    if (!volunteerLocation.address?.trim()) {
      setError('Please enter your address')
      return
    }

    setLoading(true)
    setError('')

    // Always geocode the address - don't use existing coordinates if address changed
    // This ensures new addresses get new coordinates
    const result = await updateVolunteerLocation(
      user.id,
      volunteerLocation.address.trim(),
      null, // Don't pass existing lat - force geocoding
      null  // Don't pass existing lng - force geocoding
    )

    // Handle both old format (boolean) and new format (object with success/error)
    if (result === true || (result && result.success === true)) {
      setError('')
      // Wait a moment for database to update
      await new Promise(resolve => setTimeout(resolve, 500))
      await loadVolunteerLocation()
      // Check if coordinates were actually loaded
      if (volunteerLocation.lat && volunteerLocation.lng) {
        alert('Location saved successfully! Coordinates were automatically calculated from your address.')
      } else {
        // Reload one more time in case of timing issue
        await loadVolunteerLocation()
        if (!volunteerLocation.lat || !volunteerLocation.lng) {
          setError('Location saved but coordinates could not be retrieved. Please refresh the page.')
        }
      }
    } else {
      // Show specific error message if available
      const errorMsg = result?.error || 'Failed to save location. Could not find coordinates for this address. Please try a more specific address (e.g., "123 Main St, Brooklyn, NY 11203").'
      setError(errorMsg)
      console.error('Failed to save location:', result)
    }
    
    setLoading(false)
  }

  const handleFindNearbyRequests = async () => {
    if (!volunteerLocation.address) {
      setError('Please set your location first')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Reload location to make sure we have latest coordinates
      await loadVolunteerLocation()
      
      // If we still don't have coordinates, try to geocode the address
      if (!volunteerLocation.lat || !volunteerLocation.lng) {
        setError('Finding coordinates for your address...')
        const geocoded = await geocodeAddress(volunteerLocation.address)
        if (geocoded.lat && geocoded.lng) {
          // Save the geocoded coordinates
          const result = await updateVolunteerLocation(
            user.id,
            volunteerLocation.address,
            geocoded.lat,
            geocoded.lng
          )
          // Handle both old format (boolean) and new format (object)
          if (result === true || (result && result.success === true)) {
            await loadVolunteerLocation()
          } else {
            setError(result?.error || 'Failed to save geocoded coordinates')
            setLoading(false)
            return
          }
        } else {
          setError('Could not find coordinates for your address. Please try a more specific address.')
          setLoading(false)
          return
        }
      }

      const lat = parseFloat(volunteerLocation.lat)
      const lng = parseFloat(volunteerLocation.lng)
      
      if (isNaN(lat) || isNaN(lng)) {
        setError('Invalid coordinates. Please save your location again.')
        setLoading(false)
        return
      }

      // First, make sure all requests have coordinates by geocoding them
      // Don't filter by status - geocode all requests that need it
      const { data: requestsNeedingGeocode } = await supabase
        .from('requests')
        .select('id, location, address, latitude, longitude, status')
        .or('latitude.is.null,longitude.is.null')
      
      if (requestsNeedingGeocode && requestsNeedingGeocode.length > 0) {
        // Filter to only geocode requests with 'open' or 'pending' status
        const requestsToGeocode = requestsNeedingGeocode.filter(r => 
          r.status === 'open' || r.status === 'pending'
        )
        
        if (requestsToGeocode.length > 0) {
          setError(`Adding location data to ${requestsToGeocode.length} request(s)... This will take about ${requestsToGeocode.length} second(s).`)
          
          const geocodeResult = await geocodeExistingRequests()
          console.log('Geocoding result:', geocodeResult)
          
          if (geocodeResult.success) {
            if (geocodeResult.geocoded > 0) {
              setError(`✓ Added location data to ${geocodeResult.geocoded} out of ${geocodeResult.total} request(s). Finding nearby requests...`)
              // Wait a moment for database to update
              await new Promise(resolve => setTimeout(resolve, 1000))
            } else {
              // Show specific errors if available, but don't block the process
              if (geocodeResult.errors && geocodeResult.errors.length > 0) {
                const errorPreview = geocodeResult.errors.slice(0, 2).join('; ')
                setError(`ℹ️ Could not geocode ${geocodeResult.total} request(s): ${errorPreview}. Continuing with requests that have valid coordinates...`)
              } else {
                setError('ℹ️ Could not add location data to some requests. Continuing with requests that have valid coordinates...')
              }
              // Still try to find requests - maybe some already have coordinates
            }
          } else {
            // Make it less alarming
            setError(`ℹ️ ${geocodeResult.message || 'Could not geocode some requests. Continuing...'}`)
            // Still try to find requests
          }
        }
      }
      
      let requests = await getNearbyRequestsAPI(lat, lng, 50) // 50km radius
      
      // Handle null/undefined response (backend unavailable) - use Supabase fallback
      if (!Array.isArray(requests) || requests === null) {
        console.warn('Backend unavailable, using Supabase fallback for nearby requests')
        try {
          requests = await getNearbyRequestsSupabase(lat, lng, 50)
        } catch (fallbackError) {
          console.warn('Supabase fallback also failed:', fallbackError)
          requests = []
        }
      }
      
      const requestsArray = Array.isArray(requests) ? requests : []
      console.log('Found nearby requests:', requestsArray.length)
      
      // Always check for all requests with coordinates to show them even if not nearby
      const { data: allRequests } = await supabase
        .from('requests')
        .select('id, location, address, status, latitude, longitude, name, aid_type, priority')
        .in('status', ['open', 'pending'])
      
      console.log('All requests:', allRequests)
      
      if (allRequests && allRequests.length > 0) {
        const withoutCoords = allRequests.filter(r => !r.latitude || !r.longitude)
        const withCoords = allRequests.filter(r => r.latitude && r.longitude)
        
        console.log(`Requests without coords: ${withoutCoords.length}, with coords: ${withCoords.length}`)
        
        // Calculate distances for all requests with coordinates
        const requestsWithDistance = withCoords.map(r => {
          const reqLat = parseFloat(r.latitude)
          const reqLng = parseFloat(r.longitude)
          if (isNaN(reqLat) || isNaN(reqLng)) return null
          
          // Calculate distance using Haversine formula
          const R = 6371 // Earth's radius in km
          const dLat = (reqLat - lat) * Math.PI / 180
          const dLng = (reqLng - lng) * Math.PI / 180
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat * Math.PI / 180) * Math.cos(reqLat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
          const distance = R * c
          
          return { ...r, distance_km: distance }
        }).filter(r => r !== null)
        
        // Sort by distance
        requestsWithDistance.sort((a, b) => a.distance_km - b.distance_km)
        
        // Show nearby requests (within 50km) or all if none nearby
        const nearbyRequests = requestsWithDistance.filter(r => r.distance_km <= 50)
        const requestsToShow = nearbyRequests.length > 0 ? nearbyRequests : requestsWithDistance
        
        setNearbyRequests(requestsToShow)
        
        // Set appropriate error/warning messages
        if (withoutCoords.length > 0) {
          // Some requests couldn't be geocoded
          const locations = withoutCoords.map(r => {
            const addr = r.location || r.address || 'unknown'
            return addr.length > 30 ? addr.substring(0, 30) + '...' : addr
          }).slice(0, 3)
          
          const locationList = locations.length > 0 ? `: ${locations.join(', ')}` : ''
          
          if (requestsToShow.length > 0) {
            // Show info message but still display valid requests
            setError(
              `✓ Showing ${requestsToShow.length} request(s) with valid coordinates. ` +
              `${withoutCoords.length} request(s) could not be geocoded${locationList} and are not shown. ` +
              `To include them, edit those requests and update with valid addresses.`
            )
          } else {
            // No valid requests to show - this is an actual problem
            setError(
              `⚠️ Found ${allRequests.length} request(s) but ${withoutCoords.length} need valid location data${locationList}. ` +
              `These addresses could not be geocoded. Please edit these requests and update them with valid addresses ` +
              `(e.g., "123 Main St, Charlotte, NC 28202" instead of test data).`
            )
          }
        } else if (requestsToShow.length === 0) {
          // All have coordinates but none nearby
          setError(`ℹ️ No requests found within 50km of your location. Found ${withCoords.length} request(s) with location data, but they're all further away. Try creating a request in your area or changing your location.`)
        } else if (nearbyRequests.length === 0 && requestsToShow.length > 0) {
          // Show all requests even if not nearby
          setError(`ℹ️ No requests within 50km. Showing ${requestsToShow.length} request(s) sorted by distance (closest: ${requestsToShow[0].distance_km.toFixed(1)}km).`)
        } else {
          // Success - found nearby requests
          setError('')
        }
      } else {
        setError('No requests found. Create a request first, then try again.')
        setNearbyRequests([])
      }
    } catch (err) {
      setError('Failed to fetch nearby requests: ' + (err.message || 'Unknown error'))
      setNearbyRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleOptimizeRoute = async () => {
    if (selectedRequests.length === 0) {
      setError('Please select at least one request')
      return
    }

    if (!volunteerLocation.address) {
      setError('Please set your location first')
      return
    }

    // If we have coordinates, use them. Otherwise, we'd need to geocode first
    if (!volunteerLocation.lat || !volunteerLocation.lng) {
      setError('Location coordinates needed. In production, this would be geocoded from your address automatically.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Call backend API for route optimization
      let route = await optimizeRouteAPI(
        selectedRequests.map(r => r.id),
        {
          lat: parseFloat(volunteerLocation.lat),
          lng: parseFloat(volunteerLocation.lng)
        },
        optimizationMethod
      )

      // Handle null response (backend unavailable) - use client-side fallback
      if (!route || !route.requests) {
        console.log('Backend unavailable, using client-side route optimization')
        // Don't show error - this is expected behavior when backend is down
        // setError('Backend unavailable. Using client-side optimization...')
        
        // Fetch full request details for client-side optimization
        const requestIds = selectedRequests.map(r => r.id)
        const { data: requestsData, error: fetchError } = await supabase
          .from('requests')
          .select('*')
          .in('id', requestIds)
        
        if (fetchError || !requestsData || requestsData.length === 0) {
          throw new Error('Failed to fetch request details')
        }
        
        // Filter requests with valid coordinates
        const validRequests = requestsData.filter(r => 
          r.latitude && r.longitude && 
          !isNaN(parseFloat(r.latitude)) && 
          !isNaN(parseFloat(r.longitude))
        )
        
        if (validRequests.length === 0) {
          throw new Error('No requests with valid coordinates found')
        }
        
        // Use client-side route optimizer
        const { optimizeRoute } = await import('../utils/routeOptimizer')
        const startLocation = {
          lat: parseFloat(volunteerLocation.lat),
          lng: parseFloat(volunteerLocation.lng)
        }
        
        route = await optimizeRoute(validRequests, startLocation, optimizationMethod)
        
        if (!route || !route.requests) {
          throw new Error('Client-side optimization failed')
        }
      }

      // Backend returns route with requests array and route data
      if (route && route.requests) {
        setOptimizedRoute({
          requests: route.requests,
          distance: route.distance || 0,
          duration: route.duration || 0,
          waypoints: route.waypoints || []
        })
        const distanceText = route.distance ? route.distance.toFixed(2) : 'N/A'
        const durationText = route.duration ? Math.round(route.duration / 60) : 'N/A'
        setError('') // Clear any previous errors
        // Show success message instead of alert
        setTimeout(() => {
          setError(`✓ Route optimized successfully! Distance: ${distanceText} km, Estimated time: ${durationText} min`)
          setTimeout(() => setError(''), 5000) // Clear after 5 seconds
        }, 100)
        await loadMyRoutes()
      } else {
        throw new Error('Invalid route response')
      }
    } catch (err) {
      setError('Failed to optimize route: ' + err.message)
      console.error('Route optimization error:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleRequestSelection = (request) => {
    if (selectedRequests.find(r => r.id === request.id)) {
      setSelectedRequests(selectedRequests.filter(r => r.id !== request.id))
    } else {
      setSelectedRequests([...selectedRequests, request])
    }
  }

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setLoading(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        
        // Update coordinates immediately
        setVolunteerLocation(prev => ({
          ...prev,
          lat: lat.toString(),
          lng: lng.toString()
        }))

        // Try to reverse geocode to get address
        try {
          const reversed = await reverseGeocode(lat, lng)
          if (reversed.address) {
            setVolunteerLocation(prev => ({
              ...prev,
              address: reversed.address,
              lat: lat.toString(),
              lng: lng.toString()
            }))
            setError('')
          } else {
            // If reverse geocoding fails, just use coordinates
            setVolunteerLocation(prev => ({
              ...prev,
              address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              lat: lat.toString(),
              lng: lng.toString()
            }))
            setError('Got your location! Address could not be determined automatically. You can edit it manually.')
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error)
          // Still set coordinates even if reverse geocoding fails
          setVolunteerLocation(prev => ({
            ...prev,
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            lat: lat.toString(),
            lng: lng.toString()
          }))
          setError('Got your location! Address could not be determined automatically. You can edit it manually.')
        }
        
        setLoading(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        let errorMessage = 'Could not get your location. '
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access in your browser settings.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.'
            break
          default:
            errorMessage += 'An unknown error occurred.'
            break
        }
        setError(errorMessage)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  return (
    <div className="route-optimizer p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Route Optimizer</h2>

      {/* Volunteer Location Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Set Your Location</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter your address (e.g., 123 Main St, New York, NY)"
              value={volunteerLocation.address}
              onChange={(e) => {
                // Clear coordinates when address changes so new address gets geocoded
                setVolunteerLocation({
                  address: e.target.value,
                  lat: '',
                  lng: ''
                })
              }}
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleGetCurrentLocation}
              disabled={loading}
              type="button"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 whitespace-nowrap"
              title="Use your current location from GPS"
            >
              📍 Get Current Location
            </button>
          </div>
          <button
            onClick={handleSaveLocation}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 w-full"
          >
            {loading ? 'Saving...' : 'Save Location'}
          </button>
          
          {/* Display Coordinates */}
          {(volunteerLocation.lat && volunteerLocation.lng) ? (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm font-semibold text-green-800 mb-1">📍 Coordinates Found:</p>
              <div className="text-xs text-green-700 space-y-1">
                <p><strong>Latitude:</strong> {volunteerLocation.lat}</p>
                <p><strong>Longitude:</strong> {volunteerLocation.lng}</p>
                <p className="mt-2">
                  <a 
                    href={`https://www.google.com/maps?q=${volunteerLocation.lat},${volunteerLocation.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View on Google Maps →
                  </a>
                </p>
              </div>
            </div>
          ) : volunteerLocation.address ? (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-700">
                ⚠️ Coordinates not yet calculated. Click "Save Location" to geocode your address.
              </p>
            </div>
          ) : null}
          
          <p className="text-xs text-gray-500">
            Enter your address. Coordinates will be automatically calculated from your address.
          </p>
        </div>
      </div>

      {/* Find Nearby Requests */}
      <div className="mb-6">
        <button
          onClick={async () => {
            // First, try to geocode any requests that need it, then find nearby
            setLoading(true)
            setError('')
            
            // Auto-geocode existing requests in background (don't wait if it takes long)
            geocodeExistingRequests().then(result => {
              if (result.success && result.geocoded > 0) {
                console.log(`Auto-geocoded ${result.geocoded} requests`)
              }
            }).catch(err => {
              console.warn('Background geocoding failed:', err)
            })
            
            // Then find nearby requests
            await handleFindNearbyRequests()
            setLoading(false)
          }}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Finding Requests...' : 'Find Nearby Requests'}
        </button>
        <p className="text-xs text-gray-500 mt-2">
          This will automatically find requests near your location and add location data to any requests that need it.
        </p>
      </div>

      {/* Nearby Requests List */}
      {nearbyRequests.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Nearby Requests ({nearbyRequests.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {nearbyRequests.map((request) => (
              <div
                key={request.id}
                className={`p-3 border rounded cursor-pointer ${
                  selectedRequests.find(r => r.id === request.id)
                    ? 'bg-blue-100 border-blue-500'
                    : 'bg-white border-gray-300'
                }`}
                onClick={() => toggleRequestSelection(request)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold">{request.name}</p>
                    <p className="text-sm text-gray-600">{request.location || request.address}</p>
                    <p className="text-xs text-gray-500">
                      {request.distance_km ? `${request.distance_km.toFixed(2)} km away` : ''}
                    </p>
                    {(request.latitude && request.longitude) && (
                      <p className="text-xs text-gray-400 mt-1">
                        📍 {request.latitude.toFixed(4)}, {request.longitude.toFixed(4)}
                        {' '}
                        <a 
                          href={`https://www.google.com/maps?q=${request.latitude},${request.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          (map)
                        </a>
                      </p>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={!!selectedRequests.find(r => r.id === request.id)}
                    onChange={() => toggleRequestSelection(request)}
                    className="ml-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Method Selection */}
      {selectedRequests.length > 0 && (
        <div className="mb-6">
          <label className="block mb-2 font-semibold">Optimization Method:</label>
          <select
            value={optimizationMethod}
            onChange={(e) => setOptimizationMethod(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="nearest">Nearest Neighbor (Fast, Free, Recommended)</option>
            <option value="openrouteservice">OpenRouteService (More Accurate)</option>
          </select>
        </div>
      )}

      {/* Optimize Button */}
      {selectedRequests.length > 0 && (
        <div className="mb-6">
          <button
            onClick={handleOptimizeRoute}
            disabled={loading}
            className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 disabled:opacity-50 font-semibold"
          >
            {loading ? 'Optimizing Route...' : `Optimize Route (${selectedRequests.length} stops)`}
          </button>
        </div>
      )}

      {/* Optimized Route Display */}
      {optimizedRoute && optimizedRoute.requests && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold mb-3">Optimized Route</h3>
          <div className="mb-3">
            <p><strong>Total Distance:</strong> {optimizedRoute.distance?.toFixed(2) || '0.00'} km</p>
            <p><strong>Estimated Duration:</strong> {optimizedRoute.duration ? Math.round(optimizedRoute.duration / 60) : 0} minutes</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">Route Order:</p>
            <ol className="list-decimal list-inside space-y-1">
              {optimizedRoute.requests.map((request, index) => (
                <li key={request.id} className="text-sm">
                  {index + 1}. {request.name} - {request.location || request.address}
                  {request.distanceFromPrevious && (
                    <span className="text-gray-600">
                      {' '}({request.distanceFromPrevious.toFixed(2)} km from previous)
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* My Routes */}
      {myRoutes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">My Saved Routes</h3>
          <div className="space-y-2">
            {myRoutes.map((route) => (
              <div key={route.id} className="p-3 border rounded bg-gray-50">
                <p className="font-semibold">Route #{route.id.slice(0, 8)}</p>
                <p className="text-sm">
                  Distance: {route.total_distance?.toFixed(2)} km | 
                  Duration: {Math.round(route.total_duration / 60)} min | 
                  Status: {route.status}
                </p>
                <p className="text-xs text-gray-500">
                  Created: {new Date(route.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error/Info Display */}
      {error && (
        <div className={`mt-4 p-3 border rounded ${
          error.includes('Backend unavailable') || error.includes('Using client-side') || error.startsWith('✓') || error.includes('Showing')
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : error.includes('Could not') || error.includes('Failed') || error.includes('Error')
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-yellow-50 border-yellow-200 text-yellow-700'
        }`}>
          {error}
        </div>
      )}
    </div>
  )
}
