import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data || '');
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - FIXED VERSION
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status}`, response.data);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Don't try to refresh token for login requests
    const isLoginRequest = originalRequest.url?.includes('/login');
    
    console.error('❌ Response Error:', {
      url: originalRequest.url,
      status: error.response?.status,
      data: error.response?.data,
      isLoginRequest
    });

    // Only try to refresh token if:
    // 1. It's a 401 error
    // 2. Not a login request
    // 3. Haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry && !isLoginRequest) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          console.log('🔄 Attempting to refresh token...');
          const response = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
          
          if (response.data.success) {
            const newToken = response.data.data.token;
            localStorage.setItem('token', newToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            console.log('✅ Token refreshed successfully');
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('❌ Refresh token failed:', refreshError);
        // Clear everything and redirect to login
        localStorage.clear();
        delete api.defaults.headers.common['Authorization'];
        window.location.href = '/login';
      }
    }
    
    // For login failures, just reject with the error message
    return Promise.reject(error);
  }
);

export default api;
