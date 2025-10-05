const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Get all products with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category_id').optional().isInt(),
  query('search').optional().trim(),
  query('low_stock').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const filters = {
      limit,
      offset,
      category_id: req.query.category_id,
      search: req.query.search,
      low_stock: req.query.low_stock === 'true'
    };

    const products = await Product.findAll(filters);
    
    res.json({
      products,
      pagination: {
        page,
        limit,
        total: products.length
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create new product
router.post('/', auth, [
  body('name').isLength({ min: 1 }).trim().escape(),
  body('description').optional().trim(),
  body('price').isFloat({ min: 0 }),
  body('sku').optional().trim(),
  body('category_id').optional().isInt(),
  body('quantity').optional().isInt({ min: 0 }),
  body('min_stock_level').optional().isInt({ min: 0 }),
  body('image_url').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const productData = {
      ...req.body,
      created_by: req.user.id
    };

    const product = await Product.create(productData);
    
    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', auth, [
  body('name').optional().isLength({ min: 1 }).trim().escape(),
  body('description').optional().trim(),
  body('price').optional().isFloat({ min: 0 }),
  body('sku').optional().trim(),
  body('category_id').optional().isInt(),
  body('quantity').optional().isInt({ min: 0 }),
  body('min_stock_level').optional().isInt({ min: 0 }),
  body('image_url').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.update(req.params.id, req.body, req.user.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.delete(req.params.id, req.user.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      message: 'Product deleted successfully',
      product
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Update stock
router.patch('/:id/stock', auth, [
  body('quantity').isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { quantity } = req.body;
    const product = await Product.updateStock(req.params.id, quantity, req.user.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      message: 'Stock updated successfully',
      product
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Get low stock products
router.get('/reports/low-stock', async (req, res) => {
  try {
    const products = await Product.getLowStockProducts();
    res.json(products);
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock products' });
  }
});

// Get product statistics
router.get('/reports/stats', async (req, res) => {
  try {
    const stats = await Product.getProductStats();
    res.json(stats);
  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({ error: 'Failed to fetch product statistics' });
  }
});

// Get pending sync products
router.get('/sync/pending', auth, async (req, res) => {
  try {
    const products = await Product.getPendingSyncProducts();
    res.json(products);
  } catch (error) {
    console.error('Get pending sync products error:', error);
    res.status(500).json({ error: 'Failed to fetch pending sync products' });
  }
});

// Bulk sync products
router.post('/sync/bulk', auth, [
  body('products').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { products } = req.body;
    const syncedProducts = await Product.bulkSync(products, req.user.id);
    
    res.json({
      message: 'Bulk sync completed successfully',
      synced_count: syncedProducts.length,
      products: syncedProducts
    });
  } catch (error) {
    console.error('Bulk sync error:', error);
    res.status(500).json({ error: 'Failed to sync products' });
  }
});

module.exports = router;