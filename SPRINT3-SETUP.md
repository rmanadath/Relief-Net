# 🚀 Sprint 3: Route Optimization - Setup Guide

## 📋 Overview
Sprint 3 implements the **Aid Route Optimizer** feature that generates the most efficient delivery routes for volunteers handling multiple requests. This feature uses route optimization algorithms to minimize travel time and distance.

---

## ✅ Completed Tasks

### 1. Extended Supabase Schema ✅
- ✅ Added `latitude`, `longitude`, and `address` fields to `requests` table
- ✅ Added `volunteer_location`, `volunteer_latitude`, `volunteer_longitude` to `profiles` table
- ✅ Created `optimized_routes` table to store route data
- ✅ Added geospatial indexes for performance
- ✅ Created helper functions for location queries

### 2. Route Optimization Algorithm ✅
- ✅ Implemented Nearest Neighbor algorithm (free, always available)
- ✅ Integrated OpenRouteService API support (requires API key)
- ✅ Integrated Google Maps Directions API support (requires API key)
- ✅ Automatic fallback to Nearest Neighbor if API keys not available

### 3. Database Functions ✅
- ✅ `get_nearby_requests()` - Find requests within radius
- ✅ `update_volunteer_location()` - Update volunteer coordinates
- ✅ `update_request_coordinates()` - Update request coordinates

### 4. Frontend Components ✅
- ✅ `RouteOptimizer` component for volunteers
- ✅ Updated `RequestForm` to capture coordinates
- ✅ Updated `Dashboard` with Route Optimizer tab

---

## 🚀 Setup Instructions

### Step 1: Run Database Schema Updates

1. Open your Supabase SQL Editor
2. Copy and paste the contents of `sprint3-database-enhancements.sql`
3. Execute the script
4. Verify tables were created:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'requests' AND column_name IN ('latitude', 'longitude', 'address');
   ```

### Step 2: Configure API Keys (Optional)

#### Option A: OpenRouteService (Free Tier Available)
1. Sign up at https://openrouteservice.org/
2. Get your API key from the dashboard
3. Add to `.env`:
   ```env
   REACT_APP_OPENROUTESERVICE_API_KEY=your_api_key_here
   ```

#### Option B: Google Maps Directions API
1. Go to Google Cloud Console
2. Enable "Directions API"
3. Create API key
4. Add to `.env`:
   ```env
   REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

**Note:** If no API keys are provided, the system will automatically use the Nearest Neighbor algorithm (free, always works).

### Step 3: Install Dependencies

All dependencies should already be installed. If not:
```bash
npm install
```

### Step 4: Test the Feature

1. **As a Requester:**
   - Post a request with location
   - Optionally provide coordinates (latitude/longitude)
   - Coordinates can be obtained from Google Maps

2. **As a Volunteer:**
   - Go to "Route Optimizer" tab
   - Set your location (address + coordinates)
   - Click "Find Nearby Requests"
   - Select requests to include in route
   - Choose optimization method
   - Click "Optimize Route"
   - View optimized route with distance and duration

---

## 📊 Database Schema

### Requests Table (Extended)
```sql
latitude DECIMAL(10, 8)
longitude DECIMAL(11, 8)
address TEXT
```

### Profiles Table (Extended)
```sql
volunteer_location TEXT
volunteer_latitude DECIMAL(10, 8)
volunteer_longitude DECIMAL(11, 8)
```

### Optimized Routes Table (New)
```sql
id UUID PRIMARY KEY
volunteer_id UUID REFERENCES auth.users(id)
total_distance DECIMAL(10, 2) -- in kilometers
total_duration INTEGER -- in seconds
request_order JSONB -- Array of request IDs in optimal order
route_waypoints JSONB -- Array of {lat, lng, request_id} for map display
status TEXT -- 'pending', 'active', 'completed', 'cancelled'
created_at TIMESTAMP
started_at TIMESTAMP
completed_at TIMESTAMP
```

---

## 🔧 API Functions

### Route Optimization Functions

#### `optimizeRoute(requests, startLocation, method)`
Main optimization function that automatically chooses the best available method.

**Parameters:**
- `requests`: Array of request objects with `latitude`, `longitude`
- `startLocation`: `{lat, lng}` starting point
- `method`: `'nearest'`, `'openrouteservice'`, or `'googlemaps'`

**Returns:**
```javascript
{
  requests: [...], // Optimized order
  distance: 15.5, // Total distance in km
  duration: 930 // Total duration in seconds
}
```

#### `getNearbyRequests(lat, lng, maxDistance)`
Fetches requests within a specified radius.

#### `createOptimizedRoute(volunteerId, requestIds, startLocation, method)`
Creates and saves an optimized route to the database.

---

## 🎯 Usage Examples

### Example 1: Basic Route Optimization (Nearest Neighbor)
```javascript
import { optimizeRoute } from './utils/routeOptimizer'

const requests = [
  { id: 1, name: 'Request A', latitude: 40.7128, longitude: -74.0060 },
  { id: 2, name: 'Request B', latitude: 40.7589, longitude: -73.9851 },
  { id: 3, name: 'Request C', latitude: 40.6892, longitude: -74.0445 }
]

const startLocation = { lat: 40.7128, lng: -74.0060 }

const optimized = await optimizeRoute(requests, startLocation, 'nearest')
console.log('Optimized route:', optimized.requests)
console.log('Total distance:', optimized.distance, 'km')
```

### Example 2: Using OpenRouteService
```javascript
const optimized = await optimizeRoute(requests, startLocation, 'openrouteservice')
```

### Example 3: Using Google Maps
```javascript
const optimized = await optimizeRoute(requests, startLocation, 'googlemaps')
```

---

## 🧪 Testing

### Test Database Functions
Run the test queries in `sprint3-test-schema.sql` (if created) or use these:

```sql
-- Test nearby requests function
SELECT * FROM get_nearby_requests(40.7128, -74.0060, 50, 'pending');

-- Test volunteer location update
SELECT update_volunteer_location(
  auth.uid(),
  'New York, NY',
  40.7128,
  -74.0060
);

-- View optimized routes
SELECT * FROM optimized_routes WHERE volunteer_id = auth.uid();
```

### Test Frontend
1. Create a test request with coordinates
2. Set volunteer location
3. Find nearby requests
4. Select multiple requests
5. Optimize route
6. Verify route is saved in database

---

## 📁 File Structure

```
src/
├── components/
│   └── RouteOptimizer.js       # Main route optimization UI
├── services/
│   └── routeService.js          # Supabase integration for routes
├── utils/
│   └── routeOptimizer.js        # Route optimization algorithms
└── RequestForm.js               # Updated with coordinate fields

sprint3-database-enhancements.sql  # Database schema updates
```

---

## 🔍 Troubleshooting

### Issue: "No requests found"
**Solution:** Ensure requests have valid `latitude` and `longitude` values

### Issue: "Geocoding not implemented"
**Solution:** Coordinates should be provided manually or implement a geocoding service (Google Geocoding API, OpenCage, etc.)

### Issue: Route optimization fails
**Solution:** 
- Check API keys are set correctly
- System will automatically fallback to Nearest Neighbor if APIs fail
- Verify requests have valid coordinates

### Issue: Database function errors
**Solution:**
- Ensure all schema updates were applied
- Check RLS policies allow volunteer access
- Verify user has correct role (user/volunteer/admin)

---

## 🎯 Next Steps (Future Enhancements)

1. **Geocoding Integration:**
   - Auto-geocode addresses when requests are created
   - Use Google Geocoding API or OpenCage

2. **Map Visualization:**
   - Display optimized route on interactive map
   - Show waypoints and route path

3. **Real-time Updates:**
   - Update route as requests are completed
   - Re-optimize if volunteer location changes

4. **Advanced Algorithms:**
   - Implement 2-opt or 3-opt improvements
   - Consider traffic data for more accurate estimates

5. **Multi-vehicle Support:**
   - Optimize routes for multiple volunteers
   - Balance load across volunteers

---

## ✅ Deliverable Status

- ✅ Extended Supabase schema with location fields
- ✅ Route optimization algorithm implemented
- ✅ Database functions for route management
- ✅ Frontend component for route optimization
- ✅ Integration with Supabase
- ✅ Support for multiple optimization methods
- ✅ Route storage in database

**Sprint 3 Route Optimization: COMPLETE** 🎉
