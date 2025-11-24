/**
 * Backend API Service
 * Handles communication with the Express.js backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:8080';

/**
 * Get the current user's JWT token from Supabase session
 */
async function getAuthToken() {
  const { supabase } = await import('../supabase');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Make an authenticated API request to the backend
 */
async function apiRequest(endpoint, options = {}) {
  const token = await getAuthToken();
  
  if (!token && options.requiresAuth !== false) {
    throw new Error('Authentication required. Please log in.');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  console.log(`📡 Backend API Request: ${options.method || 'GET'} ${API_BASE_URL}${endpoint}`);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    console.error('❌ Backend API Error:', error);
    throw new Error(error.error || error.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`✅ Backend API Success: ${options.method || 'GET'} ${endpoint}`);
  return data;
}

/**
 * Optimize a route using the backend API
 * @param {Array} requestIds - Array of request IDs to include
 * @param {Object} startLocation - Starting location {lat, lng}
 * @param {string} method - Optimization method ('nearest', 'openrouteservice')
 * @returns {Promise<Object>} Optimized route data
 */
export async function optimizeRoute(requestIds, startLocation, method = 'nearest') {
  console.log('🚀 Calling backend API for route optimization...', { requestIds, startLocation, method });
  const result = await apiRequest('/api/routes/optimize', {
    method: 'POST',
    body: JSON.stringify({
      requestIds,
      startLocation,
      method
    })
  });
  console.log('✅ Backend API response:', result);
  return result;
}

/**
 * Get nearby requests using the backend API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} maxDistance - Maximum distance in km (default: 50)
 * @returns {Promise<Array>} Array of nearby requests
 */
export async function getNearbyRequests(lat, lng, maxDistance = 50) {
  return apiRequest(`/api/routes/nearby?lat=${lat}&lng=${lng}&maxDistance=${maxDistance}`);
}

/**
 * Get volunteer's saved routes from the backend API
 * @returns {Promise<Array>} Array of optimized routes
 */
export async function getVolunteerRoutes() {
  return apiRequest('/api/routes/my-routes');
}

/**
 * Health check for backend API
 */
export async function checkBackendHealth() {
  try {
    return await apiRequest('/health', { requiresAuth: false });
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

