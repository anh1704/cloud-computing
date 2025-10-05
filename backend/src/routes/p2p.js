const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const db = require('../models/database');
const router = express.Router();

// Get P2P connections for current user
router.get('/connections', auth, async (req, res) => {
  try {
    const query = `
      SELECT pc.*, u.username, u.full_name, u.avatar_url, u.is_online
      FROM p2p_connections pc
      JOIN users u ON pc.user_id = u.id
      WHERE pc.user_id = $1 AND pc.status = 'active'
      ORDER BY pc.last_activity DESC
    `;
    
    const result = await db.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get P2P connections error:', error);
    res.status(500).json({ error: 'Failed to fetch P2P connections' });
  }
});

// Create P2P connection
router.post('/connections', auth, [
  body('peer_id').isLength({ min: 1 }).trim(),
  body('connection_type').optional().isIn(['direct', 'relay']),
  body('metadata').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { peer_id, connection_type = 'direct', metadata = {} } = req.body;
    
    const query = `
      INSERT INTO p2p_connections (user_id, peer_id, connection_type, metadata)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, peer_id) DO UPDATE SET
        connection_type = EXCLUDED.connection_type,
        metadata = EXCLUDED.metadata,
        last_activity = CURRENT_TIMESTAMP,
        status = 'active'
      RETURNING *
    `;
    
    const result = await db.query(query, [req.user.id, peer_id, connection_type, JSON.stringify(metadata)]);
    
    res.status(201).json({
      message: 'P2P connection created successfully',
      connection: result.rows[0]
    });
  } catch (error) {
    console.error('Create P2P connection error:', error);
    res.status(500).json({ error: 'Failed to create P2P connection' });
  }
});

// Update P2P connection status
router.patch('/connections/:peer_id', auth, [
  body('status').isIn(['active', 'inactive', 'disconnected'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const { peer_id } = req.params;
    
    const query = `
      UPDATE p2p_connections 
      SET status = $1, last_activity = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND peer_id = $3
      RETURNING *
    `;
    
    const result = await db.query(query, [status, req.user.id, peer_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'P2P connection not found' });
    }

    res.json({
      message: 'P2P connection status updated successfully',
      connection: result.rows[0]
    });
  } catch (error) {
    console.error('Update P2P connection error:', error);
    res.status(500).json({ error: 'Failed to update P2P connection' });
  }
});

// Get available peers for connection
router.get('/peers', auth, async (req, res) => {
  try {
    const query = `
      SELECT id, username, full_name, avatar_url, peer_id, is_online, last_seen
      FROM users 
      WHERE id != $1 AND is_online = true AND peer_id IS NOT NULL
      ORDER BY username
    `;
    
    const result = await db.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get available peers error:', error);
    res.status(500).json({ error: 'Failed to fetch available peers' });
  }
});

// Send sync request to peer
router.post('/sync-request', auth, [
  body('peer_id').isLength({ min: 1 }).trim(),
  body('data_type').isIn(['products', 'categories', 'all']),
  body('sync_data').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { peer_id, data_type, sync_data = {} } = req.body;
    
    // Log the sync request
    const logQuery = `
      INSERT INTO product_sync_history (product_id, action, new_data, synced_by, peer_id)
      VALUES (NULL, 'sync_request', $1, $2, $3)
      RETURNING *
    `;
    
    const syncLogData = {
      data_type,
      sync_data,
      timestamp: new Date().toISOString(),
      requester: req.user.username
    };
    
    const result = await db.query(logQuery, [JSON.stringify(syncLogData), req.user.id, peer_id]);
    
    res.json({
      message: 'Sync request sent successfully',
      sync_request: result.rows[0]
    });
  } catch (error) {
    console.error('Send sync request error:', error);
    res.status(500).json({ error: 'Failed to send sync request' });
  }
});

// Get sync history
router.get('/sync-history', auth, async (req, res) => {
  try {
    const query = `
      SELECT psh.*, u.username as synced_by_username
      FROM product_sync_history psh
      LEFT JOIN users u ON psh.synced_by = u.id
      WHERE psh.synced_by = $1 OR psh.peer_id IN (
        SELECT peer_id FROM p2p_connections WHERE user_id = $1
      )
      ORDER BY psh.timestamp DESC
      LIMIT 50
    `;
    
    const result = await db.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get sync history error:', error);
    res.status(500).json({ error: 'Failed to fetch sync history' });
  }
});

// Delete P2P connection
router.delete('/connections/:peer_id', auth, async (req, res) => {
  try {
    const { peer_id } = req.params;
    
    const query = `
      DELETE FROM p2p_connections 
      WHERE user_id = $1 AND peer_id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [req.user.id, peer_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'P2P connection not found' });
    }

    res.json({
      message: 'P2P connection deleted successfully',
      connection: result.rows[0]
    });
  } catch (error) {
    console.error('Delete P2P connection error:', error);
    res.status(500).json({ error: 'Failed to delete P2P connection' });
  }
});

module.exports = router;