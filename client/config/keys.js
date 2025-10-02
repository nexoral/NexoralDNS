const config = {
  // API Configuration
  API_BASE_URL: 'http://localhost:4773',
  API_ENDPOINTS: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    VERIFY_TOKEN: '/api/auth/verify',
    DNS_RECORDS: '/api/dns/records',
    ZONES: '/api/dns/zones',
    STATISTICS: '/api/stats',
    SETTINGS: '/api/settings'
  },

  // Application Configuration
  APP_NAME: 'NexoralDNS',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION: 'Self-Hosted DNS Server',

  // Authentication Configuration
  AUTH: {
    TOKEN_KEY: 'nexoral_auth_token',
    REFRESH_TOKEN_KEY: 'nexoral_refresh_token',
    TOKEN_EXPIRY_TIME: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    REMEMBER_ME_EXPIRY: 30 * 24 * 60 * 60 * 1000 // 30 days
  },

  // UI Configuration
  UI: {
    TOAST_DURATION: 5000,
    LOADING_TIMEOUT: 30000,
    REFRESH_INTERVAL: 30000,
    PAGINATION_LIMIT: 10
  },

  // DNS Configuration
  DNS: {
    DEFAULT_TTL: 300,
    SUPPORTED_RECORD_TYPES: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV'],
    MAX_RECORD_NAME_LENGTH: 253,
    MAX_RECORD_VALUE_LENGTH: 512
  },

  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Development flags
  DEBUG: process.env.NODE_ENV === 'development',
  ENABLE_LOGGING: true
};

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  return `${config.API_BASE_URL}${config.API_ENDPOINTS[endpoint] || endpoint}`;
};

// Helper function to get configuration values
export const getConfig = (key) => {
  return key.split('.').reduce((obj, k) => obj?.[k], config);
};

export default config;
