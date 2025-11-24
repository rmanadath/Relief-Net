/**
 * Feedback API Routes
 * Handles feedback submission
 */

import express from 'express';
import { authenticate } from '../utils/auth.js';
import { supabase } from '../server.js';

const router = express.Router();

/**
 * POST /api/feedback
 * Submit feedback for a fulfilled request
 * Requires authentication
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { requestId, rating, comments = '' } = req.body;
    const volunteerId = req.userId;

    // Validate inputs
    if (!requestId || !rating) {
      return res.status(400).json({ error: 'requestId and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if request exists and is fulfilled
    const { data: request, error: requestError } = await supabase
      .from('requests')
      .select('status')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'fulfilled') {
      return res.status(400).json({ error: 'Can only submit feedback for fulfilled requests' });
    }

    // Insert or update feedback
    const { data, error } = await supabase
      .from('feedback')
      .upsert({
        request_id: requestId,
        volunteer_id: volunteerId,
        rating,
        comments,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'request_id,volunteer_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting feedback:', error);
      return res.status(500).json({ error: 'Failed to submit feedback' });
    }

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/feedback/:requestId
 * Get feedback for a specific request
 */
router.get('/:requestId', async (req, res, next) => {
  try {
    const { requestId } = req.params;

    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('request_id', requestId);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch feedback' });
    }

    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

export default router;

