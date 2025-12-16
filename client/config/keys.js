export const config = {
  // API Configuration
  API_BASE_URL: process.env.NODE_ENV === 'development'
    ? 'http://localhost:4773'
    : typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4773` : 'http://localhost:4773',
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
    TOGGLE_SERVICE: '/api/settings/toggle-service',
    GET_DASHBOARD_ANALYTICS: '/api/analytics/get-dashboard-data',
    GET_LOGS: '/api/analytics/get-logs',
    GET_DEFAULT_TTL: '/api/settings/default-ttl',
    UPDATE_DEFAULT_TTL: '/api/settings/default-ttl',
    GET_CACHE_STATS: '/api/settings/get-cache-stat',
    DELETE_ALL_CACHE: '/api/settings/delete-all-dns-cache',
    DELETE_SPECIFIC_CACHE: '/api/settings/delete-specific-cache-key',
    // Access Control - Policies
    CREATE_ACCESS_CONTROL_POLICY: '/api/access-control/policy',
    GET_ACCESS_CONTROL_POLICIES: '/api/access-control/policies',
    GET_ACCESS_CONTROL_POLICY: '/api/access-control/policy',
    UPDATE_ACCESS_CONTROL_POLICY: '/api/access-control/policy',
    TOGGLE_ACCESS_CONTROL_POLICY: '/api/access-control/policy',
    DELETE_ACCESS_CONTROL_POLICY: '/api/access-control/policy',
    // Access Control - Domain Groups
    CREATE_DOMAIN_GROUP: '/api/access-control/domain-group',
    GET_DOMAIN_GROUPS: '/api/access-control/domain-groups',
    GET_DOMAIN_GROUP: '/api/access-control/domain-group',
    UPDATE_DOMAIN_GROUP: '/api/access-control/domain-group',
    DELETE_DOMAIN_GROUP: '/api/access-control/domain-group',
    // Access Control - IP Groups
    CREATE_IP_GROUP: '/api/access-control/ip-group',
    GET_IP_GROUPS: '/api/access-control/ip-groups',
    GET_IP_GROUP: '/api/access-control/ip-group',
    UPDATE_IP_GROUP: '/api/access-control/ip-group',
    DELETE_IP_GROUP: '/api/access-control/ip-group',
    // Access Control - Analytics
    GET_ACCESS_CONTROL_ANALYTICS: '/api/access-control/analytics',
    GET_POLICY_STATISTICS: '/api/access-control/analytics/policies'
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
