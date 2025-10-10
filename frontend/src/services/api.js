import axios from 'axios';
import toast from 'react-hot-toast';

// Multiple API endpoints for high availability
const API_ENDPOINTS = [
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  process.env.REACT_APP_API_URL_NODE_2 || 'https://product-management-node-2.onrender.com/api',
  process.env.REACT_APP_API_URL_NODE_3 || 'https://product-management-node-3.onrender.com/api',
].filter(Boolean);

let currentEndpointIndex = 0;
let failureCount = 0;

// Create axios instance with dynamic base URL
const createApiInstance = (baseURL) => {
  return axios.create({
    baseURL,
    timeout: 10000,
  });
};

// Get current API instance
const getCurrentApi = () => {
  return createApiInstance(API_ENDPOINTS[currentEndpointIndex]);
};

// Failover to next endpoint
const failoverToNextEndpoint = () => {
  currentEndpointIndex = (currentEndpointIndex + 1) % API_ENDPOINTS.length;
  failureCount++;
  console.log(`🔄 Failing over to endpoint: ${API_ENDPOINTS[currentEndpointIndex]}`);
  
  if (failureCount >= API_ENDPOINTS.length * 2) {
    toast.error('All backend nodes are unavailable. Please try again later.');
    failureCount = 0; // Reset counter
  }
};

// Smart API wrapper with automatic failover
const api = {
  async request(config) {
    for (let attempt = 0; attempt < API_ENDPOINTS.length; attempt++) {
      try {
        const apiInstance = getCurrentApi();
        const response = await apiInstance.request(config);
        
        // Reset failure count on successful request
        if (failureCount > 0) {
          failureCount = 0;
          toast.success('Connection restored');
        }
        
        return response;
      } catch (error) {
        console.error(`API request failed on ${API_ENDPOINTS[currentEndpointIndex]}:`, error.message);
        
        if (attempt < API_ENDPOINTS.length - 1) {
          failoverToNextEndpoint();
        } else {
          throw error;
        }
      }
    }
  },

  // Convenience methods
  get: (url, config = {}) => api.request({ ...config, method: 'GET', url }),
  post: (url, data, config = {}) => api.request({ ...config, method: 'POST', url, data }),
  put: (url, data, config = {}) => api.request({ ...config, method: 'PUT', url, data }),
  delete: (url, config = {}) => api.request({ ...config, method: 'DELETE', url }),
  patch: (url, data, config = {}) => api.request({ ...config, method: 'PATCH', url, data }),
};

// Override request method to add auth token
const originalRequest = api.request;
api.request = async function(config) {
  // Add auth token
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    };
  }

  try {
    const response = await originalRequest.call(this, config);
    return response;
  } catch (error) {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    const message = error.response?.data?.error || error.message || 'An error occurred';
    toast.error(message);
    
    throw error;
  }
};

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

// Cluster/Nodes API (replaces P2P)
export const clusterAPI = {
  getClusterInfo: () => api.get('/nodes/cluster'),
  getNodeStatus: () => api.get('/nodes/discover'),
  checkConsistency: () => api.post('/sync/consistency-check'),
  resolveConflicts: () => api.post('/sync/resolve-conflicts'),
  getSyncStatus: () => api.get('/sync/status'),
};

export default api;