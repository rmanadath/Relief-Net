"use client";

import { useState, useMemo, useCallback } from 'react'
import { supabase } from './supabase'

export default function RouteOptimizer({ selectedRequests, onRouteOptimized }) {
  const [optimizedRoute, setOptimizedRoute] = useState([])
  const [loading, setLoading] = useState(false)
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 }) // Default to NYC
  const [polylines, setPolylines] = useState([])
  const polylineCache = useMemo(() => new Map(), [])

  // Simple distance calculation (Haversine formula)
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }, [])

  // Simple geocoding (mock - in production use Google Maps API)
  const geocodeLocation = useCallback((location) => {
    // Mock coordinates - in production, use actual geocoding
    const mockCoords = {
      'new york': { lat: 40.7128, lng: -74.0060 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'chicago': { lat: 41.8781, lng: -87.6298 },
      'houston': { lat: 29.7604, lng: -95.3698 },
      'phoenix': { lat: 33.4484, lng: -112.0740 },
    }
    const normalized = location.toLowerCase()
    return mockCoords[normalized] || { lat: 40.7128 + (Math.random() - 0.5) * 0.1, lng: -74.0060 + (Math.random() - 0.5) * 0.1 }
  }, [])

  // Optimize route using nearest neighbor algorithm
  const optimizeRoute = useCallback(async () => {
    if (!selectedRequests || selectedRequests.length === 0) {
      alert('Please select requests to optimize')
      return
    }

    setLoading(true)
    
    try {
      // Geocode all locations
      const locations = selectedRequests.map(req => ({
        ...req,
        coords: geocodeLocation(req.location)
      }))

      // Start from first location (or admin location)
      const route = [locations[0]]
      const remaining = locations.slice(1)
      let current = locations[0]

      // Nearest neighbor algorithm
      while (remaining.length > 0) {
        let nearest = remaining[0]
        let minDistance = calculateDistance(
          current.coords.lat, current.coords.lng,
          nearest.coords.lat, nearest.coords.lng
        )

        for (let i = 1; i < remaining.length; i++) {
          const distance = calculateDistance(
            current.coords.lat, current.coords.lng,
            remaining[i].coords.lat, remaining[i].coords.lng
          )
          if (distance < minDistance) {
            minDistance = distance
            nearest = remaining[i]
          }
        }

        route.push(nearest)
        current = nearest
        remaining.splice(remaining.indexOf(nearest), 1)
      }

      // Generate polylines with caching
      const newPolylines = []
      for (let i = 0; i < route.length - 1; i++) {
        const key = `${route[i].id}-${route[i+1].id}`
        if (!polylineCache.has(key)) {
          const polyline = {
            from: route[i].coords,
            to: route[i+1].coords,
            distance: calculateDistance(
              route[i].coords.lat, route[i].coords.lng,
              route[i+1].coords.lat, route[i+1].coords.lng
            )
          }
          polylineCache.set(key, polyline)
        }
        newPolylines.push(polylineCache.get(key))
      }

      setOptimizedRoute(route)
      setPolylines(newPolylines)
      
      // Calculate center for map
      const avgLat = route.reduce((sum, r) => sum + r.coords.lat, 0) / route.length
      const avgLng = route.reduce((sum, r) => sum + r.coords.lng, 0) / route.length
      setMapCenter({ lat: avgLat, lng: avgLng })

      // Update request order in database
      for (let i = 0; i < route.length; i++) {
        await supabase
          .from('requests')
          .update({ route_order: i + 1 })
          .eq('id', route[i].id)
      }

      if (onRouteOptimized) onRouteOptimized(route)
    } catch (error) {
      console.error('Route optimization error:', error)
      alert('Error optimizing route: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [selectedRequests, geocodeLocation, calculateDistance, polylineCache, onRouteOptimized])

  // Get marker color based on status and priority
  const getMarkerColor = useCallback((request) => {
    if (request.status === 'fulfilled') return 'green'
    if (request.status === 'in-progress') return 'yellow'
    if (request.priority === 'high') return 'red'
    if (request.priority === 'medium') return 'orange'
    return 'blue'
  }, [])

  return (
    <div className="route-optimizer bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-indigo-600">Route Optimizer</h3>
        <button
          onClick={optimizeRoute}
          disabled={loading || !selectedRequests || selectedRequests.length === 0}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Optimizing...' : 'Optimize Route'}
        </button>
      </div>

      {optimizedRoute.length > 0 && (
        <div className="space-y-4">
          {/* Map Visualization (Simplified - using CSS) */}
          <div className="map-container bg-slate-100 rounded-lg p-4 h-96 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-sm">Map visualization</p>
                <p className="text-xs text-slate-400">(Integrate Google Maps API for full functionality)</p>
              </div>
            </div>
          </div>

          {/* Optimized Route List */}
          <div className="route-list bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-slate-800">Optimized Route Order</h4>
            <div className="space-y-2">
              {optimizedRoute.map((request, index) => (
                <div
                  key={request.id}
                  className="route-item bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3"
                >
                  <div className={`route-number w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    getMarkerColor(request) === 'red' ? 'bg-red-500' :
                    getMarkerColor(request) === 'yellow' ? 'bg-yellow-500' :
                    getMarkerColor(request) === 'green' ? 'bg-green-500' :
                    getMarkerColor(request) === 'orange' ? 'bg-orange-500' :
                    'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{request.name}</p>
                    <p className="text-sm text-slate-600">{request.location}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        request.priority === 'high' ? 'bg-red-100 text-red-700' :
                        request.priority === 'low' ? 'bg-slate-100 text-slate-700' :
                        'bg-violet-100 text-violet-700'
                      }`}>
                        {request.priority} priority
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        request.status === 'fulfilled' ? 'bg-green-100 text-green-700' :
                        request.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                  </div>
                  {index < optimizedRoute.length - 1 && (
                    <div className="text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Route Statistics */}
          {polylines.length > 0 && (
            <div className="route-stats grid grid-cols-3 gap-4 mt-4">
              <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-indigo-600">{optimizedRoute.length}</p>
                <p className="text-xs text-slate-600">Stops</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {polylines.reduce((sum, p) => sum + p.distance, 0).toFixed(1)}
                </p>
                <p className="text-xs text-slate-600">Total km</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {Math.round(polylines.reduce((sum, p) => sum + p.distance, 0) * 0.621371)}
                </p>
                <p className="text-xs text-slate-600">Total miles</p>
              </div>
            </div>
          )}
        </div>
      )}

      {optimizedRoute.length === 0 && !loading && (
        <div className="text-center py-8 text-slate-500">
          <p>Select requests and click "Optimize Route" to generate an optimized delivery route.</p>
        </div>
      )}
    </div>
  )
}

