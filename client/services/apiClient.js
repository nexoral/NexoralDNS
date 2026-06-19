import axios from 'axios';
import config from '../config/keys';

const apiClient = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // send httpOnly cookies automatically
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor — cookies are sent automatically via withCredentials, no manual token injection
apiClient.interceptors.request.use(
  (requestConfig) => requestConfig,
  (error) => Promise.reject(error)
);

// Track in-flight refresh to avoid concurrent refresh races
let isRefreshing = false;
let pendingRequests = [];

const processPendingRequests = (error) => {
  pendingRequests.forEach((cb) => cb(error));
  pendingRequests = [];
};

// Response interceptor — auto-refresh on 401, then retry original request once
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config: requestConfig } = error;

    if (response?.status === 401) {
      const url = requestConfig?.url ?? '';

      // These endpoints must never trigger a refresh attempt:
      // - /auth/login: credentials wrong, let caller handle
      // - /auth/refresh-token: refresh itself failed, no point retrying
      // - /auth/verify: session-check on page load, caller's try/catch handles it
      // - /auth/change-password: wrong current password, caller shows validation error
      const skipRefresh =
        url.includes('/auth/login') ||
        url.includes('/auth/refresh-token') ||
        url.includes('/auth/verify') ||
        url.includes('/auth/change-password');

      if (skipRefresh) {
        return Promise.reject(error);
      }

      if (!requestConfig._retry) {
        if (isRefreshing) {
          // Queue until the in-flight refresh completes
          return new Promise((resolve, reject) => {
            pendingRequests.push((err) => {
              if (err) return reject(err);
              requestConfig._retry = true;
              resolve(apiClient(requestConfig));
            });
          });
        }

        requestConfig._retry = true;
        isRefreshing = true;

        try {
          // Attempt to refresh — refresh_token cookie auto-sent
          await apiClient.post(config.API_ENDPOINTS.REFRESH_TOKEN);
          isRefreshing = false;
          processPendingRequests(null);
          return apiClient(requestConfig);
        } catch (refreshError) {
          isRefreshing = false;
          processPendingRequests(refreshError);
          // Refresh failed — session is fully expired, force re-login
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
          return Promise.reject(refreshError);
        }
      }

      // Already retried once and still 401 — force re-login
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }

    if (response?.status === 403) {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
