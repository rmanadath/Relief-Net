import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ 
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true 
}));

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Create a Supabase client for a specific user (respects RLS policies)
 * @param {string} userToken - User's JWT token
 * @returns {Object} Supabase client
 */
export function createUserSupabaseClient(userToken) {
  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY is required for user-specific clients');
  }
  const client = createClient(supabaseUrl, supabaseAnonKey);
  // Set the auth token for this client
  client.auth.setSession({
    access_token: userToken,
    refresh_token: '' // Not needed for API calls
  });
  return client;
}

// Import route handlers
import routesRouter from './routes/routes.js';
import requestsRouter from './routes/requests.js';
import analyticsRouter from './routes/analytics.js';
import feedbackRouter from './routes/feedback.js';

// Health check
app.get("/health", (_req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    service: 'reliefnet-backend'
  });
});

// API Routes
app.use("/api/routes", routesRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/feedback", feedbackRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 Relief-Net API server listening on port ${port}`);
  console.log(`📡 Health check: http://localhost:${port}/health`);
});

export { supabase };
export default app;
