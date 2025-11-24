import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { 
  getNearbyRequests, 
  createOptimizedRoute, 
  updateVolunteerLocation,
  getVolunteerRoutes,
  updateRouteStatus,
  geocodeExistingRequests,
  geocodeAddress,
  reverseGeocode
} from '../services/routeService'

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
      const routes = await getVolunteerRoutes(user.id)
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
              // Show specific errors if available
              const errorMsg = geocodeResult.errors && geocodeResult.errors.length > 0
                ? `Could not geocode requests: ${geocodeResult.errors.slice(0, 2).join('; ')}`
                : 'Could not add location data. Check that addresses are valid (e.g., "New York, NY" instead of just "New York").'
              setError(errorMsg)
              // Still try to find requests - maybe some already have coordinates
            }
          } else {
            setError(`Error geocoding: ${geocodeResult.message}`)
            // Still try to find requests
          }
        }
      }
      
      const requests = await getNearbyRequests(lat, lng, 50) // 50km radius
      console.log('Found nearby requests:', requests.length)
      
      if (requests.length === 0) {
        // Check if there are any requests at all
        const { data: allRequests } = await supabase
          .from('requests')
          .select('id, location, address, status, latitude, longitude')
          .in('status', ['open', 'pending'])
        
        console.log('All requests:', allRequests)
        
        if (allRequests && allRequests.length > 0) {
          const withoutCoords = allRequests.filter(r => !r.latitude || !r.longitude)
          const withCoords = allRequests.filter(r => r.latitude && r.longitude)
          
          console.log(`Requests without coords: ${withoutCoords.length}, with coords: ${withCoords.length}`)
          
          if (withoutCoords.length > 0) {
            // Show which requests need geocoding
            const locations = withoutCoords.map(r => r.location || r.address || 'unknown').slice(0, 3)
            setError(`Found ${allRequests.length} request(s) but ${withoutCoords.length} still need location data (${locations.join(', ')}). Make sure addresses are specific (e.g., "New York, NY" not just "New York"). Click "Find Nearby Requests" again.`)
          } else if (withCoords.length > 0) {
            // All have coordinates but none are nearby - show their locations
            const locations = withCoords.map(r => r.location || r.address || 'unknown').slice(0, 3)
            setError(`No requests found within 50km. Found ${withCoords.length} request(s) with location data (${locations.join(', ')}), but they're all further away from your location (${volunteerLocation.address}). Try creating a request in your area or changing your location.`)
          } else {
            setError(`Found ${allRequests.length} request(s) but none have valid location data.`)
          }
        } else {
          setError('No requests found. Create a request first, then try again.')
        }
      } else {
        setError('')
      }
      
      setNearbyRequests(requests)
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
      const route = await createOptimizedRoute(
        user.id,
        selectedRequests.map(r => r.id),
        {
          lat: parseFloat(volunteerLocation.lat),
          lng: parseFloat(volunteerLocation.lng)
        },
        optimizationMethod
      )

      setOptimizedRoute(route)
      alert(`Route optimized! Total distance: ${route.distance.toFixed(2)} km`)
      await loadMyRoutes()
    } catch (err) {
      setError('Failed to optimize route: ' + err.message)
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
      {optimizedRoute && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold mb-3">Optimized Route</h3>
          <div className="mb-3">
            <p><strong>Total Distance:</strong> {optimizedRoute.distance.toFixed(2)} km</p>
            <p><strong>Estimated Duration:</strong> {Math.round(optimizedRoute.duration / 60)} minutes</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">Route Order:</p>
            <ol className="list-decimal list-inside space-y-1">
              {optimizedRoute.requests.map((request, index) => (
                <li key={request.id} className="text-sm">
                  {index + 1}. {request.name} - {request.location}
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

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}
