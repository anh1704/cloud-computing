import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { syncService } from './services/syncService';
import { healthService } from './services/healthService';
import { CURRENT_SERVER } from './config/servers';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// CORS Configuration - Allow frontend to access backend
const corsOptions = {
  origin: true, // Tạm thời cho phép tất cả origins để test
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Server-ID', 'X-Health-Check'],
  exposedHeaders: ['X-Server-ID'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.use(express.json());

// Middleware để log request
app.use((req, res, next) => {
  console.log(`[${CURRENT_SERVER?.name || 'Unknown'}] ${req.method} ${req.path}`);
  next();
});

// REGISTER
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    const existing = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id,name,email',
      [name, email, hashed]
    );

    const token = jwt.sign({ id: result.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: result.rows[0], token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ME - Get current user from token
app.get('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Invalid token' });

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT id, name, email FROM users WHERE id=$1', [decoded.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('GET /auth/me error:', err);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

// PRODUCTS CRUD
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('GET /products error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id=$1', [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /products/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/products', async (req, res) => {
  try {
    const { name, description, price, category, stock, imageUrl } = req.body;
    const result = await pool.query(
      `INSERT INTO products (name, description, price, category, stock, image_url, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       RETURNING *`,
      [name, description, price, category, stock, imageUrl]
    );
    
    // Đồng bộ với các server khác
    await syncService.addSyncEvent('CREATE', 'products', result.rows[0]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /products error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, stock, imageUrl } = req.body;
    const result = await pool.query(
      `UPDATE products 
       SET name=$1, description=$2, price=$3, category=$4, stock=$5, image_url=$6
       WHERE id=$7 RETURNING *`,
      [name, description, price, category, stock, imageUrl, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Product not found' });
    
    // Đồng bộ với các server khác
    await syncService.addSyncEvent('UPDATE', 'products', result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /products/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id=$1 RETURNING id', [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Product not found' });
    
    // Đồng bộ với các server khác
    await syncService.addSyncEvent('DELETE', 'products', { id });
    
    res.json({ message: 'Product deleted', id });
  } catch (err) {
    console.error('DELETE /products/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// API endpoints cho distributed system

// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthStats = healthService.getHealthStats();
  res.json({
    status: 'healthy',
    server: CURRENT_SERVER,
    timestamp: new Date(),
    stats: healthStats
  });
});

// Nhận sync events từ server khác
app.post('/api/sync/receive', async (req, res) => {
  try {
    const event = req.body;
    await syncService.receiveEvent(event);
    res.json({ message: 'Event received and processed' });
  } catch (error) {
    console.error('Error receiving sync event:', error);
    res.status(500).json({ message: 'Error processing sync event' });
  }
});

// Lấy thông tin về cluster
app.get('/api/cluster/status', (req, res) => {
  const healthStatuses = healthService.getAllHealthStatuses();
  const stats = healthService.getHealthStats();
  
  res.json({
    currentServer: CURRENT_SERVER,
    healthStatuses,
    stats,
    timestamp: new Date()
  });
});

// Lấy danh sách server khỏe mạnh
app.get('/api/cluster/healthy-servers', (req, res) => {
  const healthyServers = healthService.getHealthyServers();
  const primaryServer = healthService.getPrimaryHealthyServer();
  
  res.json({
    healthyServers,
    primaryServer,
    timestamp: new Date()
  });
});

app.listen(PORT, () => {
  console.log(`[${CURRENT_SERVER?.name || 'Unknown'}] Server running on http://localhost:${PORT}`);
  console.log(`[${CURRENT_SERVER?.name || 'Unknown'}] Server ID: ${CURRENT_SERVER?.id || 'unknown'}`);
  
  // Bắt đầu health checks
  healthService.startHealthChecks(30000); // Check every 30 seconds
});

