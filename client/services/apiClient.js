import axios from 'axios';
import config from '../config/keys';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add auth token to every request
apiClient.interceptors.request.use(
  (requestConfig) => {
    const token = localStorage.getItem(config.AUTH.TOKEN_KEY);
    if (token) {
      requestConfig.headers.Authorization = token;
    }
    return requestConfig;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    // Return successful response as-is
    return response;
  },
  async (error) => {
    const { response } = error;

    // Handle 401 Unauthorized - Session expired or invalid token
    if (response?.status === 401) {
      // Clear auth state
      localStorage.removeItem(config.AUTH.TOKEN_KEY);
      localStorage.removeItem(config.AUTH.REFRESH_TOKEN_KEY);
      localStorage.removeItem('auth-storage');

      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }

      return Promise.reject(new Error('Session expired. Please login again.'));
    }

    // Handle 403 Forbidden - Insufficient permissions
    if (response?.status === 403) {
      // Clear auth state and redirect
      localStorage.removeItem(config.AUTH.TOKEN_KEY);
      localStorage.removeItem(config.AUTH.REFRESH_TOKEN_KEY);
      localStorage.removeItem('auth-storage');

      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }

      return Promise.reject(new Error('Access denied. Please login again.'));
    }

    // For all other errors, pass them through
    return Promise.reject(error);
  }
);

export default apiClient;
