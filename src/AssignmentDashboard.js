import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from './supabase';
import { createOptimizedRoute } from './services/routeService';
import { sortByTriageScore, calculateTriageScore, getTriageCategory, getTriageColor } from './utils/triageScorer';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom hook to handle map view updates
function MapUpdater({ center, bounds }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView(center, 13);
    }
  }, [center, bounds, map]);
  
  return null;
}

// Helper function to calculate bounds from coordinates
const getBounds = (coordinates) => {
  if (!coordinates || coordinates.length === 0) return null;
  return L.latLngBounds(coordinates.map(coord => [coord.lat, coord.lng]));
};

export default function AssignmentDashboard({ user }) {
  const [requests, setRequests] = useState([]);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([37.7749, -122.4194]); // Default to San Francisco
  const [mapBounds, setMapBounds] = useState(null);
  const [assignedRequests, setAssignedRequests] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch open requests
  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .or('status.eq.pending,status.eq.open,status.eq.in-progress')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter out requests already assigned to other volunteers if not admin
      const filteredData = user.role === 'admin' 
        ? data 
        : data.filter(req => !req.assigned_to || req.assigned_to === user.id);
      
      // Sort by triage score (highest priority first)
      const sortedRequests = sortByTriageScore(filteredData || []);
      
      setRequests(sortedRequests);
      
      // Update map bounds to show all requests
      if (filteredData?.length > 0) {
        const coords = filteredData
          .filter(req => req.latitude && req.longitude)
          .map(req => ({ lat: req.latitude, lng: req.longitude }));
        
        if (coords.length > 0) {
          setMapBounds(getBounds(coords));
          setMapCenter([filteredData[0].latitude, filteredData[0].longitude]);
        }
      }
    } catch (err) {
      setError('Failed to fetch requests: ' + (err.message || 'Unknown error'));
      console.error('Error fetching requests:', err);
    }
  };

  // Fetch volunteers
  const fetchVolunteers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'volunteer');
      
      if (error) throw error;
      
      // Filter out inactive volunteers if needed
      const activeVolunteers = data.filter(v => v.status !== 'inactive') || [];
      setVolunteers(activeVolunteers);
      
      // If current user is a volunteer, select them by default
      if (user.role === 'volunteer') {
        const currentUser = activeVolunteers.find(v => v.id === user.id);
        if (currentUser) {
          setSelectedVolunteer(currentUser);
        }
      } else if (activeVolunteers.length === 1) {
        // If admin and only one volunteer, select them by default
        setSelectedVolunteer(activeVolunteers[0]);
      }
    } catch (err) {
      setError('Failed to fetch volunteers: ' + (err.message || 'Unknown error'));
      console.error('Error fetching volunteers:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchVolunteers();
  }, []);

  const toggleRequestSelection = (request) => {
    setSelectedRequests(prev => {
      const isSelected = prev.some(r => r.id === request.id);
      if (isSelected) {
        return prev.filter(r => r.id !== request.id);
      } else {
        return [...prev, request];
      }
    });
  };

  const optimizeRoute = async () => {
    if (selectedRequests.length === 0 || !selectedVolunteer) {
      setError('Please select at least one request and a volunteer');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get volunteer's current location (or use a default if not available)
      const volunteerLocation = {
        lat: selectedVolunteer.volunteer_latitude || selectedVolunteer.latitude || mapCenter[0],
        lng: selectedVolunteer.volunteer_longitude || selectedVolunteer.longitude || mapCenter[1]
      };

      // Use routeService to optimize route
      const route = await createOptimizedRoute(
        selectedVolunteer.id,
        selectedRequests.map(r => r.id),
        volunteerLocation,
        'nearest' // Can be changed to 'openrouteservice' or 'googlemaps' if API keys available
      );

      // Format route data for map display
      const routeData = {
        route: route.waypoints.map(wp => ({
          id: wp.request_id,
          name: wp.name,
          latitude: wp.lat,
          longitude: wp.lng,
          location: wp.location
        })),
        distance: route.distance,
        duration: route.duration,
        volunteer: {
          id: selectedVolunteer.id,
          ...volunteerLocation
        }
      };
      
      // Update the optimized route and map view
      setOptimizedRoute(routeData);
      
      // Update map bounds to show the entire route
      if (routeData.route.length > 0) {
        const routeCoords = routeData.route.map(point => ({
          lat: point.latitude,
          lng: point.longitude
        }));
        setMapBounds(getBounds([...routeCoords, volunteerLocation]));
      }
    } catch (err) {
      setError(err.message || 'Failed to optimize route');
      console.error('Route optimization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const assignVolunteer = async () => {
    if (!optimizedRoute || !selectedVolunteer || isAssigning) return;

    setIsAssigning(true);
    setError(null);

    try {
      // Prepare batch updates
      const updates = optimizedRoute.route.map((request, index) => ({
        id: request.id,
        assigned_to: selectedVolunteer.id,
        status: 'in-progress',
        route_order: index + 1,
        updated_at: new Date().toISOString()
      }));

      // Update all requests in a single transaction
      const { data, error } = await supabase
        .from('requests')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;

      // Update local state
      setAssignedRequests(prev => [...prev, ...updates]);
      setSelectedRequests(prev => prev.filter(req => 
        !updates.some(u => u.id === req.id)
      ));
      
      // Show success message
      alert(`Successfully assigned ${updates.length} requests to ${selectedVolunteer.full_name || 'volunteer'}`);
      
      // Refresh data
      await Promise.all([fetchRequests(), fetchVolunteers()]);
      setOptimizedRoute(null);
    } catch (err) {
      setError('Failed to assign volunteer: ' + (err.message || 'Unknown error'));
      console.error('Assignment error:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  // Calculate route summary
  const routeSummary = optimizedRoute ? {
    totalDistance: optimizedRoute.distance ? optimizedRoute.distance.toFixed(1) + ' km' : 'N/A',
    estimatedTime: formatDuration(optimizedRoute.duration),
    stops: optimizedRoute.route?.length || 0,
    waypoints: optimizedRoute.route?.map((req, index) => ({
      requestId: req.id,
      position: index + 1,
      ...req
    })) || []
  } : null;

  // Helper function to format duration
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  // Get all coordinates for the route
  const getRouteCoordinates = () => {
    if (!optimizedRoute?.route?.length) return [];
    
    const coords = [];
    
    // Add volunteer's location as starting point
    const volLat = selectedVolunteer?.volunteer_latitude || selectedVolunteer?.latitude;
    const volLng = selectedVolunteer?.volunteer_longitude || selectedVolunteer?.longitude;
    if (volLat && volLng) {
      coords.push([volLat, volLng]);
    }
    
    // Add all request locations
    optimizedRoute.route.forEach(point => {
      if (point.latitude && point.longitude) {
        coords.push([point.latitude, point.longitude]);
      }
    });
    
    return coords;
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Volunteer Assignment Dashboard</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchRequests}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Volunteer and Request Selection */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* Volunteer Selection */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Select Volunteer</h3>
            <select
              className="w-full p-2 border rounded"
              value={selectedVolunteer?.id || ''}
              onChange={(e) => {
                const volunteer = volunteers.find(v => v.id === e.target.value);
                setSelectedVolunteer(volunteer || null);
              }}
            >
              <option value="">Select a volunteer</option>
              {volunteers.map(volunteer => (
                <option key={volunteer.id} value={volunteer.id}>
                  {volunteer.full_name || volunteer.email || `Volunteer ${volunteer.id.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2 overflow-y-auto">
            {requests.map(request => (
              <div 
                key={request.id}
                className={`p-3 border rounded cursor-pointer transition-colors ${
                  selectedRequests.some(r => r.id === request.id)
                    ? 'bg-blue-50 border-blue-300' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => toggleRequestSelection(request)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{request.name}</p>
                    <p className="text-sm text-gray-600">{request.aid_type}</p>
                    <p className="text-sm text-gray-500">{request.location}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    request.priority === 'high' ? 'bg-red-100 text-red-800' :
                    request.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {request.priority || 'low'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={optimizeRoute}
            disabled={selectedRequests.length === 0 || loading}
            className={`mt-4 w-full py-2 px-4 rounded-md text-white font-medium ${
              selectedRequests.length === 0 || loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Optimizing...' : 'Optimize Route'}
          </button>
        </div>

        {/* Middle panel - Map */}
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Route Visualization</h2>
            {optimizedRoute && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {routeSummary.totalDistance} • {routeSummary.estimatedTime} • {routeSummary.stops} stops
                </span>
              </div>
            )}
          </div>
          <div className="h-96 w-full rounded-md overflow-hidden border border-gray-200">
            <MapContainer 
              center={mapCenter} 
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <MapUpdater center={mapCenter} bounds={mapBounds} />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* Volunteer Marker */}
              {selectedVolunteer?.latitude && selectedVolunteer?.longitude && (
                <Marker 
                  position={[selectedVolunteer.latitude, selectedVolunteer.longitude]}
                  icon={L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                  })}
                >
                  <Popup>
                    <div>
                      <p className="font-semibold">Volunteer</p>
                      <p>{selectedVolunteer.full_name || 'Volunteer'}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* Request Markers */}
              {selectedRequests.map((request) => (
                <Marker 
                  key={request.id} 
                  position={[request.latitude, request.longitude]}
                  icon={L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                  })}
                >
                  <Popup>
                    <div>
                      <p className="font-semibold">{request.name}</p>
                      <p>{request.aid_type}</p>
                      <p className="text-sm">Priority: {request.priority}</p>
                      {optimizedRoute?.route.some(r => r.id === request.id) && (
                        <p className="text-sm text-blue-600">
                          Stop #{optimizedRoute.route.findIndex(r => r.id === request.id) + 1}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* Route Line */}
              {optimizedRoute?.geometry?.coordinates && (
                <Polyline 
                  positions={optimizedRoute.geometry.coordinates.map(coord => [coord[1], coord[0]])}
                  color="#3b82f6"
                  weight={4}
                  opacity={0.8}
                />
              )}
            </MapContainer>
          </div>
          
          {/* Route Details */}
          {routeSummary && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium mb-2">Route Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Distance:</p>
                  <p className="font-medium">{routeSummary.totalDistance}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estimated Time:</p>
                  <p className="font-medium">{routeSummary.estimatedTime}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Stops:</p>
                  <p className="font-medium">{routeSummary.stops}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Route Order:</h4>
                <ol className="list-decimal list-inside space-y-1">
                  {routeSummary.waypoints.map((waypoint) => {
                    const request = requests.find(r => r.id === waypoint.requestId);
                    return (
                      <li key={waypoint.requestId} className="text-sm">
                        {request?.name || 'Request'} - {request?.location || 'Location not available'}
                      </li>
                    );
                  })}
                </ol>
              </div>
              
              <button
                onClick={assignVolunteer}
                className="mt-4 w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Assign Volunteer to Route
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
