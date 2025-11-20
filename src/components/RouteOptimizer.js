import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { 
  getNearbyRequests, 
  createOptimizedRoute, 
  updateVolunteerLocation,
  getVolunteerRoutes,
  updateRouteStatus 
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
    // Load volunteer's previous routes
    loadMyRoutes()
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
    const routes = await getVolunteerRoutes(user.id)
    setMyRoutes(routes)
  }

  const handleSaveLocation = async () => {
    if (!volunteerLocation.address || !volunteerLocation.lat || !volunteerLocation.lng) {
      setError('Please provide address and coordinates')
      return
    }

    const success = await updateVolunteerLocation(
      user.id,
      volunteerLocation.address,
      parseFloat(volunteerLocation.lat),
      parseFloat(volunteerLocation.lng)
    )

    if (success) {
      setError('')
      alert('Location saved successfully!')
    } else {
      setError('Failed to save location')
    }
  }

  const handleFindNearbyRequests = async () => {
    if (!volunteerLocation.lat || !volunteerLocation.lng) {
      setError('Please set your location first')
      return
    }

    setLoading(true)
    setError('')

    try {
      const requests = await getNearbyRequests(
        parseFloat(volunteerLocation.lat),
        parseFloat(volunteerLocation.lng),
        50 // 50km radius
      )
      setNearbyRequests(requests)
    } catch (err) {
      setError('Failed to fetch nearby requests: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOptimizeRoute = async () => {
    if (selectedRequests.length === 0) {
      setError('Please select at least one request')
      return
    }

    if (!volunteerLocation.lat || !volunteerLocation.lng) {
      setError('Please set your location first')
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

  return (
    <div className="route-optimizer p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Route Optimizer</h2>

      {/* Volunteer Location Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Set Your Location</h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Your address/location"
            value={volunteerLocation.address}
            onChange={(e) => setVolunteerLocation({...volunteerLocation, address: e.target.value})}
            className="w-full p-2 border rounded"
          />
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={volunteerLocation.lat}
              onChange={(e) => setVolunteerLocation({...volunteerLocation, lat: e.target.value})}
              className="flex-1 p-2 border rounded"
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={volunteerLocation.lng}
              onChange={(e) => setVolunteerLocation({...volunteerLocation, lng: e.target.value})}
              className="flex-1 p-2 border rounded"
            />
          </div>
          <button
            onClick={handleSaveLocation}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Save Location
          </button>
        </div>
      </div>

      {/* Find Nearby Requests */}
      <div className="mb-6">
        <button
          onClick={handleFindNearbyRequests}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Find Nearby Requests'}
        </button>
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
                  <div>
                    <p className="font-semibold">{request.name}</p>
                    <p className="text-sm text-gray-600">{request.location}</p>
                    <p className="text-xs text-gray-500">
                      {request.distance_km ? `${request.distance_km.toFixed(2)} km away` : ''}
                    </p>
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
            <option value="nearest">Nearest Neighbor (Fast, Free)</option>
            <option value="openrouteservice">OpenRouteService (More Accurate, Requires API Key)</option>
            <option value="googlemaps">Google Maps (Most Accurate, Requires API Key)</option>
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
