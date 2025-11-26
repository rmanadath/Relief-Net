'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { 
  updateVolunteerLocation,
  geocodeExistingRequests,
  geocodeAddress,
  reverseGeocode,
  getNearbyRequests as getNearbyRequestsSupabase
} from '../services/routeService'
import {
  optimizeRoute as optimizeRouteAPI,
  getNearbyRequests as getNearbyRequestsAPI,
  getVolunteerRoutes as getVolunteerRoutesAPI
} from '../services/backendApi'

// Custom hook to handle map view updates
function MapUpdater({ center, bounds, MapComponents, selectedRoute }) {
  if (!MapComponents || !MapComponents.useMap) return null;
  
  const map = MapComponents.useMap();
  
  useEffect(() => {
    if (bounds && map.fitBounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center && map.setView) {
      map.setView(center, 13);
    }
  }, [center, bounds, map]);
  
  return null;
}

export default function VolunteerDashboard({ user }) {
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
  const [success, setSuccess] = useState('')
  const [myRoutes, setMyRoutes] = useState([])
  const [optimizationMethod, setOptimizationMethod] = useState('nearest')
  const [currentStep, setCurrentStep] = useState(1) // 1: Location, 2: Find Requests, 3: Select & Optimize, 4: Deliver
  const [selectedRequestForRoute, setSelectedRequestForRoute] = useState(null)
  const [routeToSelected, setRouteToSelected] = useState(null)
  
  // Map state
  const [isClient, setIsClient] = useState(false)
  const [MapComponents, setMapComponents] = useState(null)
  const [mapCenter, setMapCenter] = useState([35.2271, -80.8431]) // Default to Charlotte
  const [mapBounds, setMapBounds] = useState(null)

  useEffect(() => {
    loadVolunteerLocation()
    const timer = setTimeout(() => {
      loadMyRoutes()
    }, 500)
    return () => clearTimeout(timer)
  }, [user])

  // Load Leaflet map components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsClient(true)
      
      Promise.all([
        import('react-leaflet'),
        import('leaflet'),
        import('leaflet/dist/leaflet.css')
      ]).then(([reactLeaflet, leaflet]) => {
        const L = leaflet.default
        
        // Fix for default marker icons
        if (L.Icon.Default.prototype._getIconUrl) {
          delete L.Icon.Default.prototype._getIconUrl;
        }
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });
        
        setMapComponents({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
          Polyline: reactLeaflet.Polyline,
          useMap: reactLeaflet.useMap,
          L: L
        });
      }).catch(err => {
        console.error('Error loading map components:', err);
      });
    }
  }, []);

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
      if (data.volunteer_latitude && data.volunteer_longitude) {
        setMapCenter([parseFloat(data.volunteer_latitude), parseFloat(data.volunteer_longitude)])
        setCurrentStep(2) // Move to step 2 if location is already set
      }
    }
  }

  const loadMyRoutes = async () => {
    try {
      const routes = await getVolunteerRoutesAPI()
      setMyRoutes(routes || [])
    } catch (error) {
      console.error('Error loading routes:', error)
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
    setSuccess('')

    const result = await updateVolunteerLocation(
      user.id,
      volunteerLocation.address.trim(),
      null,
      null
    )

    if (result === true || (result && result.success === true)) {
      setError('')
      await new Promise(resolve => setTimeout(resolve, 500))
      await loadVolunteerLocation()
      if (volunteerLocation.lat && volunteerLocation.lng) {
        setSuccess('✓ Location saved! You can now find nearby requests.')
        setCurrentStep(2)
        setTimeout(() => setSuccess(''), 5000)
      }
    } else {
      const errorMsg = result?.error || 'Failed to save location. Please try a more specific address.'
      setError(errorMsg)
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
    setSuccess('')

    try {
      await loadVolunteerLocation()
      
      if (!volunteerLocation.lat || !volunteerLocation.lng) {
        setError('Finding coordinates for your address...')
        const geocoded = await geocodeAddress(volunteerLocation.address)
        if (geocoded.lat && geocoded.lng) {
          const result = await updateVolunteerLocation(
            user.id,
            volunteerLocation.address,
            geocoded.lat,
            geocoded.lng
          )
          if (result === true || (result && result.success === true)) {
            await loadVolunteerLocation()
          } else {
            setError(result?.error || 'Failed to save geocoded coordinates')
            setLoading(false)
            return
          }
        } else {
          setError('Could not find coordinates for your address.')
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

      // Geocode requests that need it
      const { data: requestsNeedingGeocode } = await supabase
        .from('requests')
        .select('id, location, address, latitude, longitude, status')
        .or('latitude.is.null,longitude.is.null')
      
      if (requestsNeedingGeocode && requestsNeedingGeocode.length > 0) {
        const requestsToGeocode = requestsNeedingGeocode.filter(r => 
          r.status === 'open' || r.status === 'pending' || r.status === 'in-progress'
        )
        
        if (requestsToGeocode.length > 0) {
          setError(`📍 Adding location data to ${requestsToGeocode.length} request(s)...`)
          
          try {
            const geocodeResult = await geocodeExistingRequests()
            if (geocodeResult.success && geocodeResult.geocoded > 0) {
              setError(`✓ Added location data to ${geocodeResult.geocoded} request(s). Finding nearby requests...`)
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          } catch (geocodeError) {
            console.error('Geocoding error:', geocodeError)
          }
        }
      }
      
      let requests = await getNearbyRequestsAPI(lat, lng, 50)
      
      if (!Array.isArray(requests) || requests === null) {
        console.warn('Backend unavailable, using Supabase fallback')
        try {
          requests = await getNearbyRequestsSupabase(lat, lng, 50)
        } catch (fallbackError) {
          console.warn('Supabase fallback failed:', fallbackError)
          requests = []
        }
      }
      
      const requestsArray = Array.isArray(requests) ? requests : []
      
      // Get all requests with coordinates
      const { data: allRequests } = await supabase
        .from('requests')
        .select('id, location, address, status, latitude, longitude, name, aid_type, priority, description, contact')
        .in('status', ['open', 'pending', 'in-progress'])
      
      if (allRequests && allRequests.length > 0) {
        const withCoords = allRequests.filter(r => r.latitude && r.longitude)
        
        const requestsWithDistance = withCoords.map(r => {
          const reqLat = parseFloat(r.latitude)
          const reqLng = parseFloat(r.longitude)
          if (isNaN(reqLat) || isNaN(reqLng)) return null
          
          const R = 6371
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
        
        requestsWithDistance.sort((a, b) => {
          // Sort by priority first (urgent > high > medium > low), then by distance
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
          if (priorityDiff !== 0) return priorityDiff
          return a.distance_km - b.distance_km
        })
        
        const nearbyRequests = requestsWithDistance.filter(r => r.distance_km <= 50)
        const requestsToShow = nearbyRequests.length > 0 ? nearbyRequests : requestsWithDistance
        
        setNearbyRequests(requestsToShow)
        setCurrentStep(3)
        
        // Update map bounds to show all requests
        if (requestsToShow.length > 0 && MapComponents) {
          const coords = [
            [lat, lng], // Volunteer location
            ...requestsToShow.map(r => [parseFloat(r.latitude), parseFloat(r.longitude)])
          ]
          const bounds = MapComponents.L.latLngBounds(coords)
          setMapBounds(bounds)
        }
        
        if (requestsToShow.length > 0) {
          setSuccess(`✓ Found ${requestsToShow.length} request(s) near you!`)
          setTimeout(() => setSuccess(''), 5000)
        } else {
          setError('No requests found within 50km. Showing all available requests sorted by priority.')
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

  const handleViewRouteToRequest = async (request) => {
    if (!volunteerLocation.lat || !volunteerLocation.lng) {
      setError('Please set your location first')
      return
    }

    if (!request.latitude || !request.longitude) {
      setError('This request does not have valid location data')
      return
    }

    setSelectedRequestForRoute(request)
    setLoading(true)
    setError('')

    try {
      // Calculate simple route (straight line for now, can be enhanced with routing API)
      const startLat = parseFloat(volunteerLocation.lat)
      const startLng = parseFloat(volunteerLocation.lng)
      const endLat = parseFloat(request.latitude)
      const endLng = parseFloat(request.longitude)

      // Create a simple polyline between two points
      const route = {
        coordinates: [
          [startLat, startLng],
          [endLat, endLng]
        ],
        distance: calculateDistance(startLat, startLng, endLat, endLng)
      }

      setRouteToSelected(route)
      
      // Update map to show route
      if (MapComponents) {
        const bounds = MapComponents.L.latLngBounds([
          [startLat, startLng],
          [endLat, endLng]
        ])
        setMapBounds(bounds)
      }

      setSuccess(`✓ Route to ${request.name} displayed on map`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError('Failed to calculate route: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const handleAcceptRequest = async (request) => {
    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('requests')
        .update({
          assigned_volunteer: user.email || user.id,
          status: 'in-progress'
        })
        .eq('id', request.id)

      if (updateError) {
        throw updateError
      }

      // Update local state immediately for better UX
      setNearbyRequests(prevRequests => 
        prevRequests.map(r => 
          r.id === request.id 
            ? { ...r, assigned_volunteer: user.email || user.id, status: 'in-progress' }
            : r
        )
      )

      // Automatically select the accepted request for route optimization
      if (!selectedRequests.find(r => r.id === request.id)) {
        setSelectedRequests(prev => [...prev, { ...request, assigned_volunteer: user.email || user.id, status: 'in-progress' }])
      }

      setSuccess(`✓ Accepted request from ${request.name}! It's been added to your route. You can accept more or optimize your route.`)
      setTimeout(() => setSuccess(''), 7000)
      
      // Find the next unaccepted request to highlight
      const nextRequest = nearbyRequests.find(r => 
        r.id !== request.id && 
        r.assigned_volunteer !== (user.email || user.id) &&
        (r.status === 'open' || r.status === 'pending')
      )
      
      if (nextRequest) {
        // Scroll to next request (optional - can be enhanced)
        setTimeout(() => {
          const element = document.getElementById(`request-${nextRequest.id}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
        }, 500)
      }
    } catch (err) {
      setError('Failed to accept request: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkDelivered = async (request) => {
    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('requests')
        .update({
          status: 'fulfilled'
        })
        .eq('id', request.id)

      if (updateError) {
        throw updateError
      }

      setSuccess(`✓ Marked request from ${request.name} as delivered!`)
      setTimeout(() => setSuccess(''), 5000)
      
      // Remove from nearby requests
      setNearbyRequests(nearbyRequests.filter(r => r.id !== request.id))
      setSelectedRequests(selectedRequests.filter(r => r.id !== request.id))
    } catch (err) {
      setError('Failed to mark as delivered: ' + err.message)
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

    if (!volunteerLocation.lat || !volunteerLocation.lng) {
      setError('Location coordinates needed.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      let route = await optimizeRouteAPI(
        selectedRequests.map(r => r.id),
        {
          lat: parseFloat(volunteerLocation.lat),
          lng: parseFloat(volunteerLocation.lng)
        },
        optimizationMethod
      )

      if (!route || !route.requests) {
        const requestIds = selectedRequests.map(r => r.id)
        const { data: requestsData, error: fetchError } = await supabase
          .from('requests')
          .select('*')
          .in('id', requestIds)
        
        if (fetchError || !requestsData || requestsData.length === 0) {
          throw new Error('Failed to fetch request details')
        }
        
        const validRequests = requestsData.filter(r => 
          r.latitude && r.longitude && 
          !isNaN(parseFloat(r.latitude)) && 
          !isNaN(parseFloat(r.longitude))
        )
        
        if (validRequests.length === 0) {
          throw new Error('No requests with valid coordinates found')
        }
        
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

      if (route && route.requests) {
        setOptimizedRoute({
          requests: route.requests,
          distance: route.distance || 0,
          duration: route.duration || 0,
          waypoints: route.waypoints || []
        })
        setCurrentStep(4)
        
        // Update map to show optimized route
        if (MapComponents && route.requests.length > 0) {
          const coords = [
            [parseFloat(volunteerLocation.lat), parseFloat(volunteerLocation.lng)],
            ...route.requests.map(r => [parseFloat(r.latitude), parseFloat(r.longitude)])
          ]
          const bounds = MapComponents.L.latLngBounds(coords)
          setMapBounds(bounds)
        }
        
        const distanceText = route.distance ? route.distance.toFixed(2) : 'N/A'
        const durationText = route.duration ? Math.round(route.duration / 60) : 'N/A'
        setSuccess(`✓ Route optimized! Distance: ${distanceText} km, Time: ${durationText} min`)
        setTimeout(() => setSuccess(''), 5000)
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
        
        setVolunteerLocation(prev => ({
          ...prev,
          lat: lat.toString(),
          lng: lng.toString()
        }))

        try {
          const reversed = await reverseGeocode(lat, lng)
          if (reversed.address) {
            setVolunteerLocation(prev => ({
              ...prev,
              address: reversed.address,
              lat: lat.toString(),
              lng: lng.toString()
            }))
            setMapCenter([lat, lng])
            setError('')
          } else {
            setVolunteerLocation(prev => ({
              ...prev,
              address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              lat: lat.toString(),
              lng: lng.toString()
            }))
            setMapCenter([lat, lng])
            setError('Got your location! Address could not be determined automatically.')
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error)
          setVolunteerLocation(prev => ({
            ...prev,
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            lat: lat.toString(),
            lng: lng.toString()
          }))
          setMapCenter([lat, lng])
          setError('Got your location! Address could not be determined automatically.')
        }
        
        setLoading(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        let errorMessage = 'Could not get your location. '
        
        if (error && error.code) {
          switch (error.code) {
            case 1:
              errorMessage += 'Location access was denied. Please allow location access in your browser settings.'
              break
            case 2:
              errorMessage += 'Location information is unavailable.'
              break
            case 3:
              errorMessage += 'Location request timed out.'
              break
            default:
              errorMessage += 'An unknown location error occurred.'
              break
          }
        } else {
          errorMessage += 'You can manually enter your address instead.'
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

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 border-red-500 text-red-800'
      case 'high':
        return 'bg-orange-100 border-orange-500 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800'
      case 'low':
        return 'bg-green-100 border-green-500 text-green-800'
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800'
    }
  }

  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return '🔴'
      case 'high':
        return '🟠'
      case 'medium':
        return '🟡'
      case 'low':
        return '🟢'
      default:
        return '⚪'
    }
  }

  return (
    <div className="volunteer-dashboard p-6 bg-white rounded-xl shadow-lg">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-indigo-600 mb-2">Volunteer Dashboard</h2>
        <p className="text-gray-600">Find and deliver aid to those in need</p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold ${
                currentStep >= step
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`flex-1 h-1 mx-2 ${
                  currentStep > step ? 'bg-indigo-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span className={currentStep >= 1 ? 'font-semibold text-indigo-600' : ''}>Set Location</span>
          <span className={currentStep >= 2 ? 'font-semibold text-indigo-600' : ''}>Find Requests</span>
          <span className={currentStep >= 3 ? 'font-semibold text-indigo-600' : ''}>Select & Optimize</span>
          <span className={currentStep >= 4 ? 'font-semibold text-indigo-600' : ''}>Deliver</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Controls and Requests */}
        <div className="space-y-6">
          {/* Step 1: Set Location */}
          {currentStep <= 2 && (
            <div className="p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
              <h3 className="text-lg font-semibold mb-3 text-indigo-900">📍 Step 1: Set Your Location</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter your address (e.g., 123 Main St, Charlotte, NC)"
                    value={volunteerLocation.address}
                    onChange={(e) => {
                      setVolunteerLocation({
                        address: e.target.value,
                        lat: '',
                        lng: ''
                      })
                    }}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    onClick={handleGetCurrentLocation}
                    disabled={loading}
                    type="button"
                    className="bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 whitespace-nowrap font-medium"
                    title="Use your current GPS location"
                  >
                    📍 GPS
                  </button>
                </div>
                <button
                  onClick={handleSaveLocation}
                  disabled={loading || !volunteerLocation.address}
                  className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold"
                >
                  {loading ? 'Saving...' : 'Save Location'}
                </button>
                
                {(volunteerLocation.lat && volunteerLocation.lng) && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-semibold text-green-800 mb-1">✓ Location Saved</p>
                    <p className="text-xs text-green-700">
                      Lat: {volunteerLocation.lat}, Lng: {volunteerLocation.lng}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Find Requests */}
          {currentStep >= 2 && (
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <h3 className="text-lg font-semibold mb-3 text-blue-900">🔍 Step 2: Find Nearby Requests</h3>
              <button
                onClick={handleFindNearbyRequests}
                disabled={loading || !volunteerLocation.address}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
              >
                {loading ? 'Finding Requests...' : 'Find Nearby Requests'}
              </button>
              <p className="text-xs text-gray-600 mt-2">
                Finds requests within 50km, sorted by priority and distance
              </p>
            </div>
          )}

          {/* Step 3: Nearby Requests List */}
          {nearbyRequests.length > 0 && (
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
              <h3 className="text-lg font-semibold mb-3">
                📋 Available Requests ({nearbyRequests.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {nearbyRequests.map((request) => {
                  const isSelected = !!selectedRequests.find(r => r.id === request.id)
                  const isAssigned = request.assigned_volunteer === (user.email || user.id)
                  
                  return (
                    <div
                      key={request.id}
                      id={`request-${request.id}`}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-100 border-indigo-500 shadow-md'
                          : isAssigned
                          ? 'bg-green-50 border-green-400 ring-2 ring-green-300'
                          : getPriorityColor(request.priority)
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{getPriorityIcon(request.priority)}</span>
                            <p className="font-bold text-lg">{request.name}</p>
                            {isAssigned && (
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-green-600 text-white flex items-center gap-1">
                                <span>✓</span>
                                <span>ACCEPTED</span>
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              request.priority === 'urgent' ? 'bg-red-500 text-white' :
                              request.priority === 'high' ? 'bg-orange-500 text-white' :
                              request.priority === 'medium' ? 'bg-yellow-500 text-black' :
                              'bg-green-500 text-white'
                            }`}>
                              {request.priority?.toUpperCase() || 'MEDIUM'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">
                            <strong>Type:</strong> {request.aid_type}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            📍 {request.location || request.address}
                          </p>
                          <p className="text-xs text-gray-500">
                            {request.distance_km ? `${request.distance_km.toFixed(2)} km away` : ''}
                            {request.description && ` • ${request.description.substring(0, 50)}...`}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRequestSelection(request)}
                          className="ml-2 w-5 h-5"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewRouteToRequest(request)
                          }}
                          className="flex-1 bg-indigo-500 text-white px-3 py-2 rounded text-sm font-medium hover:bg-indigo-600"
                        >
                          🗺️ View Route
                        </button>
                        {!isAssigned && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAcceptRequest(request)
                            }}
                            className="flex-1 bg-green-500 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-600"
                          >
                            ✓ Accept
                          </button>
                        )}
                        {isAssigned && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkDelivered(request)
                              }}
                              className="flex-1 bg-purple-500 text-white px-3 py-2 rounded text-sm font-medium hover:bg-purple-600"
                            >
                              ✓ Delivered
                            </button>
                            <div className="flex items-center justify-center px-3 py-2 bg-green-100 text-green-800 rounded text-sm font-medium">
                              ✓ Accepted
                            </div>
                          </>
                        )}
                      </div>
                      {isAssigned && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                          <strong>✓ You've accepted this request.</strong> Select it (checkbox) along with others to optimize your delivery route.
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3: Optimize Route */}
          {selectedRequests.length > 0 && (
            <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
              <h3 className="text-lg font-semibold mb-3 text-purple-900">
                🚗 Step 3: Optimize Route ({selectedRequests.length} selected)
              </h3>
              <div className="space-y-3">
                <select
                  value={optimizationMethod}
                  onChange={(e) => setOptimizationMethod(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="nearest">Nearest Neighbor (Fast, Recommended)</option>
                  <option value="openrouteservice">OpenRouteService (More Accurate)</option>
                </select>
                <button
                  onClick={handleOptimizeRoute}
                  disabled={loading}
                  className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold"
                >
                  {loading ? 'Optimizing...' : `Optimize Route (${selectedRequests.length} stops)`}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Optimized Route Display */}
          {optimizedRoute && optimizedRoute.requests && (
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <h3 className="text-lg font-semibold mb-3 text-green-900">✓ Step 4: Your Optimized Route</h3>
              <div className="mb-3 p-3 bg-white rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Total Distance</p>
                    <p className="text-xl font-bold text-indigo-600">
                      {optimizedRoute.distance?.toFixed(2) || '0.00'} km
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Estimated Time</p>
                    <p className="text-xl font-bold text-indigo-600">
                      {optimizedRoute.duration ? Math.round(optimizedRoute.duration / 60) : 0} min
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-sm">Route Order:</p>
                <ol className="list-decimal list-inside space-y-2 bg-white p-3 rounded-lg">
                  {optimizedRoute.requests.map((request, index) => (
                    <li key={request.id} className="text-sm">
                      <span className="font-semibold">{request.name}</span>
                      {' - '}
                      <span className="text-gray-600">{request.location || request.address}</span>
                      {request.distanceFromPrevious && (
                        <span className="text-gray-500 text-xs ml-2">
                          ({request.distanceFromPrevious.toFixed(2)} km from previous)
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Success/Error Messages */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              {success}
            </div>
          )}
          {error && (
            <div className={`p-4 border rounded-lg ${
              error.startsWith('✓') || error.includes('Found')
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {error}
            </div>
          )}
        </div>

        {/* Right Column - Map */}
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div className="h-full bg-gray-100 rounded-lg border-2 border-gray-300 overflow-hidden">
            {isClient && MapComponents ? (
              <MapComponents.MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <MapComponents.TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Volunteer Location Marker */}
                {volunteerLocation.lat && volunteerLocation.lng && (
                  <MapComponents.Marker
                    position={[parseFloat(volunteerLocation.lat), parseFloat(volunteerLocation.lng)]}
                  >
                    <MapComponents.Popup>
                      <div className="text-center">
                        <p className="font-bold text-indigo-600">📍 Your Location</p>
                        <p className="text-xs text-gray-600">{volunteerLocation.address}</p>
                      </div>
                    </MapComponents.Popup>
                  </MapComponents.Marker>
                )}
                
                {/* Request Markers */}
                {nearbyRequests.map((request) => {
                  if (!request.latitude || !request.longitude) return null
                  
                  const isSelected = selectedRequests.find(r => r.id === request.id)
                  const isAssigned = request.assigned_volunteer === (user.email || user.id)
                  
                  return (
                    <MapComponents.Marker
                      key={request.id}
                      position={[parseFloat(request.latitude), parseFloat(request.longitude)]}
                      icon={MapComponents.L.icon({
                        iconUrl: isSelected
                          ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png'
                          : request.priority === 'urgent'
                          ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'
                          : request.priority === 'high'
                          ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png'
                          : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
                        iconSize: isSelected ? [30, 45] : [25, 41],
                        iconAnchor: isSelected ? [15, 45] : [12, 41],
                        popupAnchor: [0, -41]
                      })}
                    >
                      <MapComponents.Popup>
                        <div>
                          <p className="font-bold">{request.name}</p>
                          <p className="text-xs text-gray-600">{request.location || request.address}</p>
                          <p className="text-xs">
                            <span className={`px-2 py-1 rounded ${
                              request.priority === 'urgent' ? 'bg-red-500 text-white' :
                              request.priority === 'high' ? 'bg-orange-500 text-white' :
                              request.priority === 'medium' ? 'bg-yellow-500 text-black' :
                              'bg-green-500 text-white'
                            }`}>
                              {request.priority?.toUpperCase() || 'MEDIUM'}
                            </span>
                          </p>
                          {request.distance_km && (
                            <p className="text-xs text-gray-500 mt-1">
                              {request.distance_km.toFixed(2)} km away
                            </p>
                          )}
                          <button
                            onClick={() => handleViewRouteToRequest(request)}
                            className="mt-2 w-full bg-indigo-500 text-white px-2 py-1 rounded text-xs hover:bg-indigo-600"
                          >
                            View Route
                          </button>
                        </div>
                      </MapComponents.Popup>
                    </MapComponents.Marker>
                  )
                })}
                
                {/* Route to Selected Request */}
                {routeToSelected && routeToSelected.coordinates && (
                  <MapComponents.Polyline
                    positions={routeToSelected.coordinates}
                    color="blue"
                    weight={4}
                    opacity={0.7}
                    dashArray="10, 10"
                  />
                )}
                
                {/* Optimized Route */}
                {optimizedRoute && optimizedRoute.requests && optimizedRoute.requests.length > 0 && (
                  <MapComponents.Polyline
                    positions={[
                      [parseFloat(volunteerLocation.lat), parseFloat(volunteerLocation.lng)],
                      ...optimizedRoute.requests.map(r => [parseFloat(r.latitude), parseFloat(r.longitude)])
                    ]}
                    color="purple"
                    weight={5}
                    opacity={0.8}
                  />
                )}
                
                <MapUpdater 
                  center={mapCenter} 
                  bounds={mapBounds} 
                  MapComponents={MapComponents}
                  selectedRoute={routeToSelected}
                />
              </MapComponents.MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p>Loading map...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

