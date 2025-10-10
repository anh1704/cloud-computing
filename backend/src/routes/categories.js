const express = require('express');
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create new category
router.post('/', auth, [
  body('name').isLength({ min: 1 }).trim().escape(),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('icon').optional().trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const categoryData = {
      ...req.body,
      created_by: req.user.id
    };

    const category = await Category.create(categoryData);
    
    // Sync to other nodes
    const dataSyncService = req.app.get('dataSyncService');
    if (dataSyncService) {
      try {
        await dataSyncService.syncCategory('create', category);
        console.log(`Category sync queued: ${category.id}`);
      } catch (syncError) {
        console.error('Category sync failed:', syncError.message);
      }
    }
    
    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', auth, [
  body('name').optional().isLength({ min: 1 }).trim().escape(),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('icon').optional().trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const category = await Category.update(req.params.id, req.body);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Sync to other nodes
    const dataSyncService = req.app.get('dataSyncService');
    if (dataSyncService) {
      try {
        await dataSyncService.syncCategory('update', category);
        console.log(`Category update sync queued: ${category.id}`);
      } catch (syncError) {
        console.error('Category sync failed:', syncError.message);
      }
    }

    res.json({
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', auth, async (req, res) => {
  try {
    const category = await Category.delete(req.params.id);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Sync to other nodes
    const dataSyncService = req.app.get('dataSyncService');
    if (dataSyncService) {
      try {
        await dataSyncService.syncCategory('delete', { id: req.params.id });
        console.log(`Category delete sync queued: ${req.params.id}`);
      } catch (syncError) {
        console.error('Category sync failed:', syncError.message);
      }
    }

    res.json({
      message: 'Category deleted successfully',
      category
    });
  } catch (error) {
    console.error('Delete category error:', error);
    if (error.message.includes('Cannot delete category')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Get category statistics
router.get('/reports/stats', async (req, res) => {
  try {
    const stats = await Category.getCategoryStats();
    res.json(stats);
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({ error: 'Failed to fetch category statistics' });
  }
});

// Get popular categories
router.get('/reports/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const categories = await Category.getPopularCategories(limit);
    res.json(categories);
  } catch (error) {
    console.error('Get popular categories error:', error);
    res.status(500).json({ error: 'Failed to fetch popular categories' });
  }
});

module.exports = router;