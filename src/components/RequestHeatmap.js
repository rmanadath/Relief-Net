import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { supabase } from '../supabase';

// Create a custom hook to handle the heatmap layer
function HeatmapLayer({ data }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0 || !map) return;

    // Convert data to heatmap format: [lat, lng, intensity]
    // Filter out invalid coordinates
    const heatData = data
      .filter(point => point.latitude != null && point.longitude != null)
      .map(point => [
        parseFloat(point.latitude),
        parseFloat(point.longitude),
        point.intensity || 1 // Default intensity is 1 if not specified
      ]);

    if (heatData.length === 0) return;

    // Remove existing heat layer if it exists
    if (heatLayerRef.current) {
      heatLayerRef.current.remove();
    }

    // Add new heat layer
    try {
      heatLayerRef.current = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
      }).addTo(map);

      // Fit map to bounds of heatmap data
      if (heatData.length > 0) {
        const validData = data.filter(point => point.latitude != null && point.longitude != null);
        if (validData.length > 0) {
          const group = new L.featureGroup(
            validData.map(point => L.marker([parseFloat(point.latitude), parseFloat(point.longitude)]))
          );
          map.fitBounds(group.getBounds().pad(0.1));
        }
      }
    } catch (error) {
      console.error('Error adding heat layer:', error);
    }

    // Cleanup function
    return () => {
      if (heatLayerRef.current) {
        heatLayerRef.current.remove();
      }
    };
  }, [data, map]);

  return null;
}

export default function RequestHeatmap({ onPointClick }) {
  const [heatmapData, setHeatmapData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequestData = async () => {
      try {
        setIsLoading(true);
        const { data: requests, error: fetchError } = await supabase
          .from('requests')
          .select('id, latitude, longitude, status, aid_type, created_at, priority');

        if (fetchError) throw fetchError;

        // Process data for heatmap
        const processedData = requests.map(request => {
          // Calculate intensity based on priority and age
          const now = new Date();
          const createdAt = new Date(request.created_at);
          const hoursOld = (now - createdAt) / (1000 * 60 * 60); // Convert ms to hours
          
          // Higher intensity for older requests (max 1.0 after 24 hours)
          const ageIntensity = Math.min(1, hoursOld / 24);
          
          // Higher intensity for higher priority
          const priorityIntensity = {
            high: 1.0,
            medium: 0.7,
            low: 0.4
          }[request.priority?.toLowerCase() || 'medium'];
          
          // Average the factors
          const intensity = (ageIntensity + priorityIntensity) / 2;

          return {
            ...request,
            intensity
          };
        });

        setHeatmapData(processedData);
      } catch (err) {
        console.error('Error fetching request data:', err);
        setError('Failed to load heatmap data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequestData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden border border-gray-200 relative">
      <MapContainer
        center={[37.7749, -122.4194]} // Default to San Francisco
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <HeatmapLayer data={heatmapData} />
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-md z-[1000]">
        <div className="flex items-center mb-2">
          <div className="w-5 h-5 bg-blue-500 mr-2"></div>
          <span className="text-sm">Low Need</span>
        </div>
        <div className="flex items-center mb-2">
          <div className="w-5 h-5 bg-yellow-500 mr-2"></div>
          <span className="text-sm">Medium Need</span>
        </div>
        <div className="flex items-center">
          <div className="w-5 h-5 bg-red-500 mr-2"></div>
          <span className="text-sm">High Need</span>
        </div>
      </div>
    </div>
  );
}
