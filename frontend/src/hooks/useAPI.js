export const useAPI = () => {
  const getToken = () => localStorage.getItem('authToken');
  
  const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const makeRequest = async (endpoint, options = {}) => {
    const url = `${BASE_URL}${endpoint}`;
    
    const token = getToken();
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  };

  return {
    get: (endpoint, options = {}) => 
      makeRequest(endpoint, { method: 'GET', ...options }),
    
    post: (endpoint, data, options = {}) => 
      makeRequest(endpoint, { method: 'POST', body: data, ...options }),
    
    put: (endpoint, data, options = {}) => 
      makeRequest(endpoint, { method: 'PUT', body: data, ...options }),
    
    delete: (endpoint, options = {}) => 
      makeRequest(endpoint, { method: 'DELETE', ...options }),
    
    patch: (endpoint, data, options = {}) => 
      makeRequest(endpoint, { method: 'PATCH', body: data, ...options }),
  };
};