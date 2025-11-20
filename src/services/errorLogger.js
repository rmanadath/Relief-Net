/**
 * Error Logging Service
 * Logs errors to Supabase error_logs table for tracking and debugging
 */

import { supabase } from '../supabase';

/**
 * Log an error to the database
 * @param {string} errorType - Type of error ('maps_api', 'supabase_write', 'route_optimization', etc.)
 * @param {Error|string} error - Error object or error message
 * @param {Object} context - Additional context (request_id, user_id, etc.)
 */
export async function logError(errorType, error, context = {}) {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;

    // Call Supabase function to log error
    const { data, error: logError } = await supabase.rpc('log_error', {
      p_error_type: errorType,
      p_error_message: errorMessage,
      p_error_stack: errorStack,
      p_context: context
    });

    if (logError) {
      // Fallback: log to console if database logging fails
      console.error('Failed to log error to database:', logError);
      console.error('Original error:', {
        type: errorType,
        message: errorMessage,
        stack: errorStack,
        context
      });
    }

    return data;
  } catch (err) {
    // Last resort: console error
    console.error('Error logging service failed:', err);
    console.error('Original error:', {
      type: errorType,
      error: error instanceof Error ? error.message : String(error),
      context
    });
  }
}

/**
 * Log Maps API errors
 */
export async function logMapsApiError(error, context = {}) {
  return logError('maps_api', error, {
    ...context,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log Supabase write errors
 */
export async function logSupabaseError(error, context = {}) {
  return logError('supabase_write', error, {
    ...context,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log route optimization errors
 */
export async function logRouteOptimizationError(error, context = {}) {
  return logError('route_optimization', error, {
    ...context,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log authentication errors
 */
export async function logAuthError(error, context = {}) {
  return logError('authentication', error, {
    ...context,
    timestamp: new Date().toISOString()
  });
}

/**
 * Get error logs (admin only)
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of error logs
 */
export async function getErrorLogs(filters = {}) {
  try {
    let query = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.errorType) {
      query = query.eq('error_type', filters.errorType);
    }

    if (filters.resolved !== undefined) {
      query = query.eq('resolved', filters.resolved);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      await logSupabaseError(error, { operation: 'get_error_logs' });
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch error logs:', error);
    throw error;
  }
}

