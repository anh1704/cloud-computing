const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Polyfill fetch for Node.js compatibility
if (!globalThis.fetch) {
  const fetch = require('node-fetch');
  globalThis.fetch = fetch;
}

const db = require('./models/database');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const userRoutes = require('./routes/users');
const syncRoutes = require('./routes/sync');
const nodeRoutes = require('./routes/nodes');

const SocketService = require('./services/socketService');
const NodeManager = require('./services/nodeManager');
const LoadBalancer = require('./services/loadBalancer');
const DataSyncService = require('./services/dataSyncService');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://product-management-frontend-v3pk.onrender.com",
      process.env.CORS_ORIGIN
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Rate limiting - skip OPTIONS requests for CORS preflight
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => req.method === 'OPTIONS' // Skip rate limiting for preflight requests
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      fontSrc: ["'self'", "data:"]
    }
  }
}));
app.use(compression());
app.use(morgan('combined'));

// CORS must be before rate limiter to handle preflight requests
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://product-management-frontend-v3pk.onrender.com",
    "https://product-management-node-1.onrender.com",
    "https://product-management-node-2.onrender.com", 
    "https://product-management-node-3.onrender.com",
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Rate limiter after CORS
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded images) with CORS headers
app.use('/uploads', (req, res, next) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "https://product-management-frontend-v3pk.onrender.com",
    "https://product-management-node-1.onrender.com",
    "https://product-management-node-2.onrender.com",
    "https://product-management-node-3.onrender.com",
    process.env.CORS_ORIGIN
  ].filter(Boolean);
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
}, express.static('uploads'));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  const allowedOrigins = [
    "http://localhost:3000", 
    "https://product-management-frontend-v3pk.onrender.com",
    "https://product-management-node-1.onrender.com",
    "https://product-management-node-2.onrender.com",
    "https://product-management-node-3.onrender.com",
    process.env.CORS_ORIGIN
  ].filter(Boolean);
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Product Management System API',
    status: 'OK',
    version: '1.0.1',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories',
      users: '/api/users',
      sync: '/api/sync',
      nodes: '/api/nodes'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Product Management API'
  });
});

// Initialize distributed system services
const PORT_NUMBER = parseInt(process.env.PORT) || 5000;
const nodeId = process.env.NODE_ID || `node-${PORT_NUMBER}-${Date.now()}`;
const nodeManager = new NodeManager(nodeId, PORT_NUMBER);
const loadBalancer = new LoadBalancer(nodeManager);
const dataSyncService = new DataSyncService(nodeManager, loadBalancer);

// Make services available to routes
app.set('nodeManager', nodeManager);
app.set('loadBalancer', loadBalancer);
app.set('dataSyncService', dataSyncService);

// Socket.IO setup
const socketService = new SocketService(io);
socketService.initialize();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/nodes', nodeRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await db.initialize();
    console.log('✅ Database connected successfully');
    
    server.listen(PORT_NUMBER, () => {
      console.log(`🚀 Server running on port ${PORT_NUMBER}`);
      console.log(`📊 Health check: http://localhost:${PORT_NUMBER}/health`);
      console.log(`🔗 WebSocket server ready`);
      console.log(`🌐 Node ID: ${nodeManager.nodeId}`);
      console.log(`⚖️ Load balancer initialized`);
      console.log(`🔄 Data sync service ready`);
      
      // Cloud deployment node discovery
      if (process.env.NODE_ENV === 'production' && process.env.DISCOVERY_NODES) {
        console.log('🌩️ Cloud deployment detected, setting up node discovery...');
        
        // Delay discovery to allow other nodes to start
        setTimeout(async () => {
          const discoveryNodes = process.env.DISCOVERY_NODES.split(',').filter(Boolean);
          
          for (const nodeUrl of discoveryNodes) {
            try {
              console.log(`🔍 Attempting to register with ${nodeUrl}`);
              
              const response = await fetch(`${nodeUrl}/api/nodes/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  nodeId: nodeId,
                  port: PORT_NUMBER
                }),
                timeout: 5000
              });
              
              if (response.ok) {
                const result = await response.json();
                console.log(`✅ Successfully registered with ${nodeUrl}`);
                
                // Register discovered nodes locally
                if (result.cluster && result.cluster.nodes) {
                  result.cluster.nodes.forEach(node => {
                    if (node.id !== nodeId) {
                      nodeManager.registerNode(node.id, node.port, node.status);
                    }
                  });
                }
              } else {
                console.log(`❌ Failed to register with ${nodeUrl}: ${response.status}`);
              }
            } catch (error) {
              console.log(`❌ Registration failed for ${nodeUrl}:`, error.message);
            }
          }
        }, 15000); // Wait 15 seconds for other services to start
      } else if (process.env.DISCOVERY_NODES) {
        // Local development discovery
        console.log('🏠 Local development node discovery...');
        setTimeout(() => {
          const discoveryNodes = process.env.DISCOVERY_NODES.split(',');
          discoveryNodes.forEach(nodeAddr => {
            const [host, port] = nodeAddr.split(':');
            if (port && port !== PORT_NUMBER.toString()) {
              console.log(`🔍 Attempting to discover node at ${host}:${port}`);
              nodeManager.registerNode(`node-${port}`, parseInt(port), 'healthy');
            }
          });
        }, 3000);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server };