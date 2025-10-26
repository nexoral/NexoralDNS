export const config = {
  // API Configuration
  API_BASE_URL: process.env.NODE_ENV === 'development'
    ? 'http://localhost:4773'
    : typeof window !== 'undefined' ? `${window.location.hostname}:4773` : 'http://localhost:4773',
  API_ENDPOINTS: {
    LOGIN: '/api/auth/login',
    VERIFY_TOKEN: '/api/auth/verify',
    GET_ALL_DOMAINS: '/api/domains/all-domains',
    DNS_RECORDS: '/api/dns/records',
    DNS_LIST: '/api/dns/list',
    CREATE_DNS: '/api/dns/create-dns',
    UPDATE_DNS: '/api/dns/update',
    DELETE_DNS: '/api/dns/delete',
    ZONES: '/api/dns/zones',
    STATISTICS: '/api/stats',
    SETTINGS: '/api/settings',
    LIST_OF_DEVICES: '/api/dhcp/list-of-available-ips',
    REFRESH_DEVICE_LIST: '/api/dhcp/refresh-connected-ips',
    CREATE_DOMAIN: '/api/domains/create-domain',
    DELETE_DOMAIN: '/api/domains/delete',
    SERVICE_INFO: '/api/service-info',
    TOGGLE_SERVICE: '/api/settings/toggle-service'
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
