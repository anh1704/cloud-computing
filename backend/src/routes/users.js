const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role,
      is_online: user.is_online,
      last_seen: user.last_seen,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.put('/profile', auth, [
  body('full_name').optional().trim().escape(),
  body('avatar_url').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.updateProfile(req.user.id, req.body);
    
    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get online users
router.get('/online', auth, async (req, res) => {
  try {
    const users = await User.getOnlineUsers();
    res.json(users);
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// Update peer ID for P2P connections
router.patch('/peer-id', auth, [
  body('peer_id').isLength({ min: 1 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { peer_id } = req.body;
    const user = await User.updatePeerId(req.user.id, peer_id);
    
    res.json({
      message: 'Peer ID updated successfully',
      user
    });
  } catch (error) {
    console.error('Update peer ID error:', error);
    res.status(500).json({ error: 'Failed to update peer ID' });
  }
});

// Admin routes
// Get all users (admin only)
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const query = `
      SELECT id, username, email, full_name, avatar_url, role, 
             is_active, is_online, last_seen, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `;
    
    const result = await require('../models/database').query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user status (admin only)
router.patch('/:id/status', auth, adminAuth, [
  body('is_active').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { is_active } = req.body;
    const query = `
      UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, email, is_active
    `;
    
    const result = await require('../models/database').query(query, [is_active, req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User status updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Update user role (admin only)
router.patch('/:id/role', auth, adminAuth, [
  body('role').isIn(['user', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { role } = req.body;
    const query = `
      UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, email, role
    `;
    
    const result = await require('../models/database').query(query, [role, req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

module.exports = router;