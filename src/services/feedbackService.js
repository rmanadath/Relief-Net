/**
 * Feedback Service
 * Handles feedback submission and retrieval
 */

import { supabase } from '../supabase';
import { logSupabaseError } from './errorLogger';

/**
 * Submit feedback for a request
 * @param {string} requestId - Request ID
 * @param {string} volunteerId - Volunteer user ID
 * @param {number} rating - Rating (1-5)
 * @param {string} comments - Optional comments
 * @returns {Promise<Object>} Created feedback
 */
export async function submitFeedback(requestId, volunteerId, rating, comments = '') {
  try {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const { data, error } = await supabase
      .from('feedback')
      .upsert({
        request_id: requestId,
        volunteer_id: volunteerId,
        rating: rating,
        comments: comments.trim(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'request_id,volunteer_id'
      })
      .select()
      .single();

    if (error) {
      await logSupabaseError(error, {
        operation: 'submit_feedback',
        request_id: requestId,
        volunteer_id: volunteerId
      });
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    throw error;
  }
}

/**
 * Get feedback for a request
 * @param {string} requestId - Request ID
 * @returns {Promise<Array>} Array of feedback
 */
export async function getFeedbackForRequest(requestId) {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select(`
        *,
        volunteer:profiles!feedback_volunteer_id_fkey (
          id,
          full_name,
          role
        )
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) {
      await logSupabaseError(error, {
        operation: 'get_feedback_for_request',
        request_id: requestId
      });
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch feedback:', error);
    throw error;
  }
}

/**
 * Get feedback submitted by a volunteer
 * @param {string} volunteerId - Volunteer user ID
 * @returns {Promise<Array>} Array of feedback
 */
export async function getFeedbackByVolunteer(volunteerId) {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select(`
        *,
        request:requests!feedback_request_id_fkey (
          id,
          name,
          aid_type,
          location
        )
      `)
      .eq('volunteer_id', volunteerId)
      .order('created_at', { ascending: false });

    if (error) {
      await logSupabaseError(error, {
        operation: 'get_feedback_by_volunteer',
        volunteer_id: volunteerId
      });
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch volunteer feedback:', error);
    throw error;
  }
}

/**
 * Update existing feedback
 * @param {string} feedbackId - Feedback ID
 * @param {number} rating - New rating (1-5)
 * @param {string} comments - New comments
 * @returns {Promise<Object>} Updated feedback
 */
export async function updateFeedback(feedbackId, rating, comments = '') {
  try {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const { data, error } = await supabase
      .from('feedback')
      .update({
        rating: rating,
        comments: comments.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', feedbackId)
      .select()
      .single();

    if (error) {
      await logSupabaseError(error, {
        operation: 'update_feedback',
        feedback_id: feedbackId
      });
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to update feedback:', error);
    throw error;
  }
}

