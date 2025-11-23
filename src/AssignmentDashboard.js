'use client'
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from './supabase';
import { createOptimizedRoute } from './services/routeService';
import { sortByTriageScore, calculateTriageScore, getTriageCategory, getTriageColor } from './utils/triageScorer';
import RequestHeatmap from './components/RequestHeatmap';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import FeedbackForm from './components/FeedbackForm';

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
  const [routeSummary, setRouteSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('map'); // 'map', 'analytics', or 'heatmap'
  const [selectedRequestForFeedback, setSelectedRequestForFeedback] = useState(null);

  // Fetch aid requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .in('status', ['open', 'in-progress']);

      if (error) throw error;
      
      // Calculate triage scores for each request
      const requestsWithScores = data.map(request => ({
        ...request,
        triageScore: calculateTriageScore(request),
        triageCategory: getTriageCategory(calculateTriageScore(request))
      }));
      
      // Sort by triage score (highest first)
      const sortedRequests = sortByTriageScore(requestsWithScores);
      setRequests(sortedRequests);
      
      // Update map bounds to show all requests if we have any
      if (sortedRequests.length > 0) {
        const requestLocations = sortedRequests
          .filter(req => req.latitude && req.longitude)
          .map(req => ({ lat: req.latitude, lng: req.longitude }));
          
        if (requestLocations.length > 0) {
          setMapBounds(getBounds(requestLocations));
        }
      }
    } catch (err) {
      setError('Failed to fetch requests: ' + (err.message || 'Unknown error'));
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch volunteers
  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'volunteer');

      if (error) throw error;
      setVolunteers(data || []);
      
      // If no volunteer is selected, select the first one by default
      if (data && data.length > 0 && !selectedVolunteer) {
        setSelectedVolunteer(data[0].id);
      }
    } catch (err) {
      setError('Failed to fetch volunteers: ' + (err.message || 'Unknown error'));
      console.error('Error fetching volunteers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchVolunteers();
  }, []);

  const toggleRequestSelection = (request) => {
    setSelectedRequests(prev => {
      if (prev.includes(request.id)) {
        return prev.filter(id => id !== request.id);
      } else {
        return [...prev, request.id];
      }
    });
  };

  const optimizeRoute = async () => {
    if (selectedRequests.length === 0 || !selectedVolunteer) {
      setError('Please select at least one request and a volunteer');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get the selected volunteer's location
      const volunteer = volunteers.find(v => v.id === selectedVolunteer);
      if (!volunteer) {
        throw new Error('Selected volunteer not found');
      }

      // Get the selected requests with their locations
      const selectedRequestData = requests.filter(req => 
        selectedRequests.includes(req.id)
      );

      // Create waypoints for the route optimization
      const waypoints = selectedRequestData.map(req => ({
        id: req.id,
        location: { lat: req.latitude, lng: req.longitude },
        priority: req.priority || 'medium',
        status: req.status || 'pending'
      }));

      // Get volunteer's current location (or use a default if not available)
      const volunteerLocation = {
        lat: volunteer.latitude || mapCenter[0],
        lng: volunteer.longitude || mapCenter[1]
      };

      // Call the route optimization service
      const optimizedRoute = await createOptimizedRoute(
        volunteerLocation,
        waypoints
      );

      // Update the map with the optimized route
      setOptimizedRoute(optimizedRoute);
      
      // Update the map view to show the entire route
      if (optimizedRoute && optimizedRoute.route.length > 0) {
        const routeCoordinates = optimizedRoute.route.map(point => ({
          lat: point.lat,
          lng: point.lng
        }));
        setMapBounds(getBounds(routeCoordinates));
      }
      
      // Calculate route summary
      if (optimizedRoute) {
        setRouteSummary({
          totalDistance: (optimizedRoute.distance / 1000).toFixed(1) + ' km',
          estimatedTime: formatDuration(optimizedRoute.duration),
          stops: optimizedRoute.waypoints.length,
          waypoints: optimizedRoute.waypoints.map((wp, index) => ({
            id: wp.id,
            name: `Stop ${index + 1}`,
            address: wp.address || 'Unknown address',
            distance: wp.distance ? `${(wp.distance / 1000).toFixed(1)} km` : 'N/A',
            duration: wp.duration ? formatDuration(wp.duration) : 'N/A'
          }))
        });
      }
    } catch (err) {
      console.error('Error optimizing route:', err);
      setError('Failed to optimize route: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format duration in minutes to HH:MM:SS
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  };

  // Get marker icon based on request status
  const getMarkerIcon = (status) => {
    const iconUrl = {
      'open': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      'in-progress': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
      'fulfilled': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'
    }[status] || 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';

    return L.icon({
      iconUrl,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  };

  // Get polyline positions for the route
  const getPolylinePositions = () => {
    if (!optimizedRoute) return [];
    return optimizedRoute.route.map(point => [point.lat, point.lng]);
  };

  // Handle request completion
  const handleRequestCompletion = (requestId) => {
    setSelectedRequestForFeedback(requests.find(r => r.id === requestId));
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Crisis Aid Optimizer</h2>
        <div className="flex items-center space-x-2">
          {/* Tab Navigation */}
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'map' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Map View
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'analytics' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'heatmap' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Heatmap
            </button>
          </div>
          
          <button
            onClick={optimizeRoute}
            disabled={loading || selectedRequests.length === 0 || !selectedVolunteer}
            className={`px-4 py-2 rounded-md text-white ${
              loading || selectedRequests.length === 0 || !selectedVolunteer
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {loading ? 'Optimizing...' : 'Optimize Route'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'map' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Volunteer and Request Selection */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* Volunteer Selection */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-3">Select Volunteer</h3>
            <select
              value={selectedVolunteer || ''}
              onChange={(e) => setSelectedVolunteer(e.target.value)}
              className="w-full p-2 border rounded-md"
              disabled={loading}
            >
              <option value="">Select a volunteer</option>
              {volunteers.map(volunteer => (
                <option key={volunteer.id} value={volunteer.id}>
                  {volunteer.full_name || `Volunteer ${volunteer.id.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Request List */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-3">Select Requests</h3>
            <div className="space-y-2">
              {loading && requests.length === 0 ? (
                <div className="text-center py-4">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No requests found</div>
              ) : (
                requests.map(request => (
                  <div
                    key={request.id}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      selectedRequests.includes(request.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => toggleRequestSelection(request)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{request.name || 'Unnamed Request'}</h4>
                        <p className="text-sm text-gray-600">{request.aid_type}</p>
                        <div className="flex items-center mt-1">
                          <span className={`inline-block w-3 h-3 rounded-full mr-1 ${
                            request.status === 'open' ? 'bg-green-500' : 
                            request.status === 'in-progress' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}></span>
                          <span className="text-xs text-gray-500 capitalize">
                            {request.status || 'unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          request.priority === 'high' ? 'bg-red-100 text-red-800' :
                          request.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {request.priority || 'low'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column - Map and Route Details */}
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow">
          <div className="h-[calc(100vh-250px)] rounded-md overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* Volunteer Marker */}
              {selectedVolunteer && (
                <Marker
                  position={[
                    volunteers.find(v => v.id === selectedVolunteer)?.latitude || mapCenter[0],
                    volunteers.find(v => v.id === selectedVolunteer)?.longitude || mapCenter[1]
                  ]}
                  icon={L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                  })}
                >
                  <Popup>
                    <div className="font-medium">
                      {volunteers.find(v => v.id === selectedVolunteer)?.full_name || 'Volunteer'}
                    </div>
                    <div className="text-sm text-gray-600">Your current location</div>
                  </Popup>
                </Marker>
              )}
              
              {/* Request Markers */}
              {requests.map(request => (
                <Marker
                  key={request.id}
                  position={[request.latitude, request.longitude]}
                  icon={getMarkerIcon(request.status)}
                >
                  <Popup>
                    <div>
                      <h4 className="font-medium">{request.name || 'Unnamed Request'}</h4>
                      <p className="text-sm">{request.aid_type}</p>
                      <p className="text-sm">{request.description}</p>
                      <div className="mt-1 text-xs text-gray-500">
                        <div>Priority: <span className="capitalize">{request.priority || 'medium'}</span></div>
                        <div>Status: <span className="capitalize">{request.status || 'open'}</span></div>
                        {request.status === 'in-progress' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestCompletion(request.id);
                            }}
                            className="mt-2 px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                          >
                            Mark as Completed
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              <MapUpdater center={mapCenter} bounds={mapBounds} />
            </MapContainer>
          </div>
          
          {/* Route Summary */}
          {routeSummary && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium mb-2">Route Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Total Distance</div>
                  <div className="text-lg font-medium">{routeSummary.totalDistance}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Estimated Time</div>
                  <div className="text-lg font-medium">{routeSummary.estimatedTime}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Number of Stops</div>
                  <div className="text-lg font-medium">{routeSummary.stops}</div>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Route Details</h4>
                <div className="space-y-2">
                  {routeSummary.waypoints.map((stop, index) => (
                    <div key={index} className="flex items-start p-2 bg-white rounded border">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-1 mr-3">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{stop.name}</div>
                        <div className="text-sm text-gray-600">{stop.address}</div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Distance: {stop.distance}</span>
                          <span>Time: {stop.duration}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    // Implement assign route to volunteer
                    alert('Route assigned to volunteer successfully!');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Assign Route to Volunteer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="bg-white p-4 rounded-lg shadow">
          <AnalyticsDashboard />
        </div>
      )}

      {/* Heatmap Tab */}
      {activeTab === 'heatmap' && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Request Heatmap</h3>
          <RequestHeatmap 
            onPointClick={(point) => {
              // Handle point click if needed
              console.log('Heatmap point clicked:', point);
            }} 
          />
          <div className="mt-4 text-sm text-gray-500">
            <p>This heatmap shows the density and urgency of aid requests. Hotter colors indicate areas with more urgent or numerous requests.</p>
          </div>
        </div>
      )}

      {/* Feedback Form Modal */}
      {selectedRequestForFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Delivery Feedback</h3>
              <button 
                onClick={() => setSelectedRequestForFeedback(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FeedbackForm 
              requestId={selectedRequestForFeedback.id}
              volunteerId={user?.id}
              onSubmitted={() => {
                // Refresh requests after feedback submission
                fetchRequests();
                setSelectedRequestForFeedback(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
