import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    const message = error.response?.data?.error || error.message || 'An error occurred';
    toast.error(message);
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verifyToken: () => api.get('/auth/verify'),
};

// Products API
export const productsAPI = {
  getAll: (params = {}) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (productData) => api.post('/products', productData),
  update: (id, productData) => api.put(`/products/${id}`, productData),
  delete: (id) => api.delete(`/products/${id}`),
  updateStock: (id, quantity) => api.patch(`/products/${id}/stock`, { quantity }),
  getLowStock: () => api.get('/products/reports/low-stock'),
  getStats: () => api.get('/products/reports/stats'),
  getPendingSync: () => api.get('/products/sync/pending'),
  bulkSync: (products) => api.post('/products/sync/bulk', { products }),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (categoryData) => api.post('/categories', categoryData),
  update: (id, categoryData) => api.put(`/categories/${id}`, categoryData),
  delete: (id) => api.delete(`/categories/${id}`),
  getStats: () => api.get('/categories/reports/stats'),
  getPopular: (limit = 5) => api.get('/categories/reports/popular', { params: { limit } }),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (profileData) => api.put('/users/profile', profileData),
  getOnlineUsers: () => api.get('/users/online'),
  updatePeerId: (peerId) => api.patch('/users/peer-id', { peer_id: peerId }),
  
  // Admin only
  getAllUsers: () => api.get('/users'),
  updateUserStatus: (id, isActive) => api.patch(`/users/${id}/status`, { is_active: isActive }),
  updateUserRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
};

// P2P API
export const p2pAPI = {
  getConnections: () => api.get('/p2p/connections'),
  createConnection: (connectionData) => api.post('/p2p/connections', connectionData),
  updateConnectionStatus: (peerId, status) => api.patch(`/p2p/connections/${peerId}`, { status }),
  getAvailablePeers: () => api.get('/p2p/peers'),
  sendSyncRequest: (syncData) => api.post('/p2p/sync-request', syncData),
  getSyncHistory: () => api.get('/p2p/sync-history'),
  deleteConnection: (peerId) => api.delete(`/p2p/connections/${peerId}`),
};

export default api;