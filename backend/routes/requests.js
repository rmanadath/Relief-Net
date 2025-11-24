/**
 * Requests API Routes
 * Handles request-related operations
 */

import express from 'express';
import { authenticate, optionalAuth } from '../utils/auth.js';
import { supabase } from '../server.js';

const router = express.Router();

/**
 * GET /api/requests
 * Get all requests (with optional filters)
 * Optional authentication for public viewing
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { status, priority, aid_type, limit = 100 } = req.query;
    
    let query = supabase
      .from('requests')
      .select('*')
      .limit(parseInt(limit));

    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (aid_type) {
      query = query.eq('aid_type', aid_type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      return res.status(500).json({ error: 'Failed to fetch requests' });
    }

    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/requests
 * Create a new request
 * Requires authentication
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, contact, aid_type, priority, description, location, address } = req.body;

    // Validate required fields
    if (!name || !contact || !aid_type || !description || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('requests')
      .insert({
        user_id: req.userId,
        name,
        contact,
        aid_type,
        priority: priority || 'medium',
        description,
        location,
        address,
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating request:', error);
      return res.status(500).json({ error: 'Failed to create request', message: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/requests/:id
 * Update a request
 * Requires authentication (must be owner or admin)
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if user owns the request or is admin
    const { data: request, error: fetchError } = await supabase
      .from('requests')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.userId)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isOwner = request.user_id === req.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Not authorized to update this request' });
    }

    const { data, error } = await supabase
      .from('requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating request:', error);
      return res.status(500).json({ error: 'Failed to update request' });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

