const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const crypto = require('crypto');

// Middleware để kiểm tra request từ node khác
const nodeAuthMiddleware = (req, res, next) => {
  const sourceNode = req.headers['x-node-source'];
  if (!sourceNode) {
    return res.status(401).json({ error: 'Node authentication required' });
  }
  
  // Thêm source node vào request
  req.sourceNode = sourceNode;
  next();
};

// Sync single product
router.post('/products', nodeAuthMiddleware, async (req, res) => {
  try {
    const { action, data } = req.body;
    
    console.log(`Received product sync from ${req.sourceNode}: ${action}`);
    
    let result;
    
    switch (action) {
      case 'create':
        result = await Product.create(data);
        break;
      case 'update':
        result = await Product.update(data.id, data);
        break;
      case 'delete':
        result = await Product.delete(data.id);
        break;
      default:
        return res.status(400).json({ error: 'Invalid sync action' });
    }
    
    res.json({ 
      success: true, 
      result,
      syncedBy: req.sourceNode 
    });
  } catch (error) {
    console.error('Product sync error:', error.message);
    res.status(500).json({ 
      error: error.message,
      action: req.body.action 
    });
  }
});

// Bulk sync products
router.post('/products/bulk', nodeAuthMiddleware, async (req, res) => {
  try {
    const { products } = req.body;
    
    console.log(`Received bulk product sync from ${req.sourceNode}: ${products.length} products`);
    
    // Xóa tất cả products hiện tại và insert lại
    await Product.deleteAll();
    
    const results = [];
    for (const product of products) {
      const result = await Product.create(product);
      results.push(result);
    }
    
    res.json({ 
      success: true, 
      synced: results.length,
      syncedBy: req.sourceNode 
    });
  } catch (error) {
    console.error('Bulk product sync error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Sync single category
router.post('/categories', nodeAuthMiddleware, async (req, res) => {
  try {
    const { action, data } = req.body;
    
    console.log(`Received category sync from ${req.sourceNode}: ${action}`);
    
    let result;
    
    switch (action) {
      case 'create':
        result = await Category.create(data);
        break;
      case 'update':
        result = await Category.update(data.id, data);
        break;
      case 'delete':
        result = await Category.delete(data.id);
        break;
      default:
        return res.status(400).json({ error: 'Invalid sync action' });
    }
    
    res.json({ 
      success: true, 
      result,
      syncedBy: req.sourceNode 
    });
  } catch (error) {
    console.error('Category sync error:', error.message);
    res.status(500).json({ 
      error: error.message,
      action: req.body.action 
    });
  }
});

// Bulk sync categories
router.post('/categories/bulk', nodeAuthMiddleware, async (req, res) => {
  try {
    const { categories } = req.body;
    
    console.log(`Received bulk category sync from ${req.sourceNode}: ${categories.length} categories`);
    
    // Xóa tất cả categories hiện tại và insert lại
    await Category.deleteAll();
    
    const results = [];
    for (const category of categories) {
      const result = await Category.create(category);
      results.push(result);
    }
    
    res.json({ 
      success: true, 
      synced: results.length,
      syncedBy: req.sourceNode 
    });
  } catch (error) {
    console.error('Bulk category sync error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Sync single user
router.post('/users', nodeAuthMiddleware, async (req, res) => {
  try {
    const { action, data } = req.body;
    
    console.log(`Received user sync from ${req.sourceNode}: ${action}`);
    
    let result;
    
    switch (action) {
      case 'create':
        result = await User.create(data);
        break;
      case 'update':
        result = await User.update(data.id, data);
        break;
      case 'delete':
        result = await User.delete(data.id);
        break;
      default:
        return res.status(400).json({ error: 'Invalid sync action' });
    }
    
    res.json({ 
      success: true, 
      result,
      syncedBy: req.sourceNode 
    });
  } catch (error) {
    console.error('User sync error:', error.message);
    res.status(500).json({ 
      error: error.message,
      action: req.body.action 
    });
  }
});

// Get data hash for consistency check
router.get('/hash', async (req, res) => {
  try {
    const products = await Product.getAll();
    const categories = await Category.getAll();
    
    const data = {
      products: products.sort((a, b) => a.id - b.id),
      categories: categories.sort((a, b) => a.id - b.id)
    };
    
    const dataString = JSON.stringify(data);
    const dataHash = crypto.createHash('md5').update(dataString).digest('hex');
    
    res.json({ 
      dataHash,
      timestamp: Date.now(),
      productCount: products.length,
      categoryCount: categories.length
    });
  } catch (error) {
    console.error('Hash generation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get sync status
router.get('/status', (req, res) => {
  const app = req.app;
  const nodeManager = app.get('nodeManager');
  const dataSyncService = app.get('dataSyncService');
  const loadBalancer = app.get('loadBalancer');
  
  if (!nodeManager || !dataSyncService || !loadBalancer) {
    return res.status(500).json({ error: 'Services not initialized' });
  }
  
  res.json({
    cluster: nodeManager.getClusterStats(),
    sync: dataSyncService.getSyncStats(),
    loadBalancer: loadBalancer.getStats()
  });
});

// Trigger consistency check
router.post('/consistency-check', async (req, res) => {
  try {
    const app = req.app;
    const dataSyncService = app.get('dataSyncService');
    
    if (!dataSyncService) {
      return res.status(500).json({ error: 'DataSyncService not initialized' });
    }
    
    const result = await dataSyncService.checkDataConsistency();
    res.json(result);
  } catch (error) {
    console.error('Consistency check error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Resolve conflicts
router.post('/resolve-conflicts', async (req, res) => {
  try {
    const app = req.app;
    const dataSyncService = app.get('dataSyncService');
    
    if (!dataSyncService) {
      return res.status(500).json({ error: 'DataSyncService not initialized' });
    }
    
    const result = await dataSyncService.resolveConflicts();
    res.json(result);
  } catch (error) {
    console.error('Conflict resolution error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;