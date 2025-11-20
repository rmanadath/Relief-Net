/**
 * Analytics Service
 * Aggregates delivery metrics and analytics data
 */

import { supabase } from '../supabase';
import { logSupabaseError } from './errorLogger';

/**
 * Get delivery analytics for a date range
 * @param {Date} startDate - Start date (default: 30 days ago)
 * @param {Date} endDate - End date (default: now)
 * @returns {Promise<Object>} Analytics data
 */
export async function getDeliveryAnalytics(startDate = null, endDate = null) {
  try {
    // Default to last 30 days
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Call Supabase function
    const { data, error } = await supabase.rpc('get_delivery_analytics', {
      p_start_date: start.toISOString(),
      p_end_date: end.toISOString()
    });

    if (error) {
      await logSupabaseError(error, { operation: 'get_delivery_analytics' });
      throw error;
    }

    // Function returns array, get first result
    return data && data.length > 0 ? data[0] : {
      total_requests: 0,
      completed_requests: 0,
      fulfilled_requests: 0,
      completion_rate: 0,
      avg_response_time_hours: 0,
      avg_completion_time_hours: 0,
      requests_by_priority: {},
      requests_by_aid_type: {}
    };
  } catch (error) {
    console.error('Failed to fetch delivery analytics:', error);
    throw error;
  }
}

/**
 * Get average feedback rating
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Rating statistics
 */
export async function getFeedbackStats(startDate = null, endDate = null) {
  try {
    let query = supabase
      .from('feedback')
      .select('rating');

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      await logSupabaseError(error, { operation: 'get_feedback_stats' });
      throw error;
    }

    if (!data || data.length === 0) {
      return {
        averageRating: 0,
        totalFeedback: 0,
        ratingDistribution: {}
      };
    }

    const ratings = data.map(f => f.rating);
    const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    // Count ratings by value
    const ratingDistribution = ratings.reduce((acc, rating) => {
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {});

    return {
      averageRating: Math.round(averageRating * 100) / 100,
      totalFeedback: ratings.length,
      ratingDistribution
    };
  } catch (error) {
    console.error('Failed to fetch feedback stats:', error);
    throw error;
  }
}

/**
 * Get volunteer performance metrics
 * @param {string} volunteerId - Volunteer user ID (optional, for specific volunteer)
 * @returns {Promise<Object>} Performance metrics
 */
export async function getVolunteerPerformance(volunteerId = null) {
  try {
    let query = supabase
      .from('delivery_logs')
      .select(`
        volunteer_id,
        status_to,
        changed_at,
        request:requests!delivery_logs_request_id_fkey (
          priority,
          aid_type
        )
      `);

    if (volunteerId) {
      query = query.eq('volunteer_id', volunteerId);
    }

    const { data, error } = await query;

    if (error) {
      await logSupabaseError(error, { operation: 'get_volunteer_performance' });
      throw error;
    }

    if (!data || data.length === 0) {
      return {
        totalDeliveries: 0,
        completedDeliveries: 0,
        fulfilledDeliveries: 0,
        averageResponseTime: 0
      };
    }

    const completed = data.filter(log => log.status_to === 'resolved' || log.status_to === 'fulfilled');
    const fulfilled = data.filter(log => log.status_to === 'fulfilled');

    return {
      totalDeliveries: data.length,
      completedDeliveries: completed.length,
      fulfilledDeliveries: fulfilled.length,
      completionRate: data.length > 0 ? (completed.length / data.length * 100).toFixed(2) : 0
    };
  } catch (error) {
    console.error('Failed to fetch volunteer performance:', error);
    throw error;
  }
}

/**
 * Get request response time statistics
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Response time stats
 */
export async function getResponseTimeStats(startDate = null, endDate = null) {
  try {
    let query = supabase
      .from('requests')
      .select('created_at, started_at, completed_at, delivered_at, priority');

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      await logSupabaseError(error, { operation: 'get_response_time_stats' });
      throw error;
    }

    if (!data || data.length === 0) {
      return {
        averageResponseTime: 0,
        averageCompletionTime: 0,
        averageDeliveryTime: 0,
        totalRequests: 0
      };
    }

    // Calculate response times (time from created to started)
    const responseTimes = data
      .filter(r => r.started_at)
      .map(r => {
        const created = new Date(r.created_at);
        const started = new Date(r.started_at);
        return (started - created) / (1000 * 60 * 60); // Convert to hours
      });

    // Calculate completion times (time from started to completed)
    const completionTimes = data
      .filter(r => r.started_at && r.completed_at)
      .map(r => {
        const started = new Date(r.started_at);
        const completed = new Date(r.completed_at);
        return (completed - started) / (1000 * 60 * 60); // Convert to hours
      });

    // Calculate delivery times (time from created to delivered)
    const deliveryTimes = data
      .filter(r => r.delivered_at)
      .map(r => {
        const created = new Date(r.created_at);
        const delivered = new Date(r.delivered_at);
        return (delivered - created) / (1000 * 60 * 60); // Convert to hours
      });

    const avgResponse = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const avgCompletion = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    const avgDelivery = deliveryTimes.length > 0
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
      : 0;

    return {
      averageResponseTime: Math.round(avgResponse * 100) / 100,
      averageCompletionTime: Math.round(avgCompletion * 100) / 100,
      averageDeliveryTime: Math.round(avgDelivery * 100) / 100,
      totalRequests: data.length,
      requestsWithResponse: responseTimes.length,
      requestsCompleted: completionTimes.length,
      requestsDelivered: deliveryTimes.length
    };
  } catch (error) {
    console.error('Failed to fetch response time stats:', error);
    throw error;
  }
}

