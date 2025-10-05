// Simple server check for Render deployment
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(express.json());

// Test routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Product Management System API',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Product Management API'
  });
});

// Test API route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Import main app
try {
  const mainApp = require('./src/app');
  console.log('Main app loaded successfully');
} catch (error) {
  console.error('Error loading main app:', error);
  
  // Fallback routes
  app.get('/api/*', (req, res) => {
    res.status(503).json({ 
      error: 'Service temporarily unavailable',
      message: 'Main application failed to load',
      timestamp: new Date().toISOString()
    });
  });
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;