/**
 * Analytics API Routes
 * Handles analytics and metrics
 */

import express from 'express';
import { authenticate } from '../utils/auth.js';
import { supabase } from '../server.js';

const router = express.Router();

/**
 * GET /api/analytics
 * Get delivery analytics
 * Requires authentication (admin only)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.userId)
      .single();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();

    // Try to use database function
    try {
      const { data, error } = await supabase.rpc('get_delivery_analytics', {
        p_start_date: start,
        p_end_date: end
      });

      if (!error && data && data.length > 0) {
        return res.json(data[0]);
      }
    } catch (rpcError) {
      console.warn('Analytics function not available, using fallback');
    }

    // Fallback: Calculate analytics manually
    const { data: requests, error: requestsError } = await supabase
      .from('requests')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end);

    if (requestsError) {
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }

    const totalRequests = requests?.length || 0;
    const completedRequests = requests?.filter(r => r.status === 'fulfilled').length || 0;
    const openRequests = requests?.filter(r => r.status === 'open').length || 0;

    const analytics = {
      total_requests: totalRequests,
      completed_requests: completedRequests,
      fulfilled_requests: completedRequests,
      open_requests: openRequests,
      completion_rate: totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0,
      avg_response_time_hours: 0, // Would need delivery_logs to calculate
      avg_completion_time_hours: 0,
      requests_by_priority: {},
      requests_by_aid_type: {}
    };

    // Group by priority
    requests?.forEach(req => {
      analytics.requests_by_priority[req.priority] = 
        (analytics.requests_by_priority[req.priority] || 0) + 1;
      analytics.requests_by_aid_type[req.aid_type] = 
        (analytics.requests_by_aid_type[req.aid_type] || 0) + 1;
    });

    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

export default router;

