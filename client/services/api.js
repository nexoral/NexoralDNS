import apiClient from './apiClient';
import { getApiUrl } from '../config/keys';

// API Service Layer - Centralized API calls
export const api = {
  // Authentication
  login: (credentials) =>
    apiClient.post(getApiUrl('LOGIN'), credentials),

  verifyToken: () =>
    apiClient.get(getApiUrl('VERIFY_TOKEN')),

  // Create Custom LAN Domain
  getAllDomains: () =>
    apiClient.get(getApiUrl('GET_ALL_DOMAINS')),

  createDomain: (data) =>
    apiClient.post(getApiUrl('CREATE_DOMAIN'), data),

  deleteDomain: (data) =>
    apiClient.delete(getApiUrl('DELETE_DOMAIN'), { data }),

  // DNS Records Management
  getDnsRecords: (domainName) =>
    apiClient.get(`${getApiUrl('DNS_LIST')}/${domainName}`),

  createDnsRecord: (data) =>
    apiClient.post(getApiUrl('CREATE_DNS'), data),

  updateDnsRecord: (recordId, data) =>
    apiClient.put(`${getApiUrl('UPDATE_DNS')}/${recordId}`, data),

  deleteDnsRecord: (data) =>
    apiClient.put(getApiUrl('DELETE_DNS'), data),

  // Device/Network Management
  getDeviceList: () =>
    apiClient.get(getApiUrl('LIST_OF_DEVICES')),

  refreshDeviceList: () =>
    apiClient.get(getApiUrl('REFRESH_DEVICE_LIST')),

  // Service Management
  getServiceInfo: () =>
    apiClient.get(getApiUrl('SERVICE_INFO')),

  toggleService: () =>
    apiClient.get(getApiUrl('TOGGLE_SERVICE')),

  // Statistics
  getStatistics: () =>
    apiClient.get(getApiUrl('STATISTICS')),

  // Settings
  getSettings: () =>
    apiClient.get(getApiUrl('SETTINGS')),

  // DNS Zones
  getZones: () =>
    apiClient.get(getApiUrl('ZONES')),

  // Analytics
  getDashboardAnalytics: () =>
    apiClient.get(getApiUrl('GET_DASHBOARD_ANALYTICS')),

  getLogs: (params) =>
    apiClient.get(getApiUrl('GET_LOGS'), {
      params,
      validateStatus: (status) => {
        // Treat 404 as valid response (no data found)
        return (status >= 200 && status < 300) || status === 404;
      }
    }),

  // Default TTL Management
  getDefaultTTL: () =>
    apiClient.get(getApiUrl('GET_DEFAULT_TTL')),

  updateDefaultTTL: (data) =>
    apiClient.put(getApiUrl('UPDATE_DEFAULT_TTL'), data),

  // Cache Management
  getCacheStats: (params) =>
    apiClient.get(getApiUrl('GET_CACHE_STATS'), { params }),

  deleteAllCache: () =>
    apiClient.delete(getApiUrl('DELETE_ALL_CACHE')),

  deleteSpecificCache: (keyName) =>
    apiClient.delete(getApiUrl('DELETE_SPECIFIC_CACHE'), { params: { keyName } }),

  // Access Control Policy Management
  createAccessControlPolicy: (data) =>
    apiClient.post(getApiUrl('CREATE_ACCESS_CONTROL_POLICY'), data),

  getAccessControlPolicies: (params) =>
    apiClient.get(getApiUrl('GET_ACCESS_CONTROL_POLICIES'), { params }),

  getAccessControlPolicyById: (policyId) =>
    apiClient.get(`${getApiUrl('GET_ACCESS_CONTROL_POLICY')}/${policyId}`),

  updateAccessControlPolicy: (policyId, data) =>
    apiClient.put(`${getApiUrl('UPDATE_ACCESS_CONTROL_POLICY')}/${policyId}`, data),

  toggleAccessControlPolicy: (policyId) =>
    apiClient.patch(`${getApiUrl('TOGGLE_ACCESS_CONTROL_POLICY')}/${policyId}/toggle`),

  deleteAccessControlPolicy: (policyId) =>
    apiClient.delete(`${getApiUrl('DELETE_ACCESS_CONTROL_POLICY')}/${policyId}`),

  // Domain Group Management
  createDomainGroup: (data) =>
    apiClient.post(getApiUrl('CREATE_DOMAIN_GROUP'), data),

  getDomainGroups: (params) =>
    apiClient.get(getApiUrl('GET_DOMAIN_GROUPS'), { params }),

  getDomainGroupById: (groupId) =>
    apiClient.get(`${getApiUrl('GET_DOMAIN_GROUP')}/${groupId}`),

  updateDomainGroup: (groupId, data) =>
    apiClient.put(`${getApiUrl('UPDATE_DOMAIN_GROUP')}/${groupId}`, data),

  deleteDomainGroup: (groupId) =>
    apiClient.delete(`${getApiUrl('DELETE_DOMAIN_GROUP')}/${groupId}`),

  // IP Group Management
  createIPGroup: (data) =>
    apiClient.post(getApiUrl('CREATE_IP_GROUP'), data),

  getIPGroups: (params) =>
    apiClient.get(getApiUrl('GET_IP_GROUPS'), { params }),

  getIPGroupById: (groupId) =>
    apiClient.get(`${getApiUrl('GET_IP_GROUP')}/${groupId}`),

  updateIPGroup: (groupId, data) =>
    apiClient.put(`${getApiUrl('UPDATE_IP_GROUP')}/${groupId}`, data),

  deleteIPGroup: (groupId) =>
    apiClient.delete(`${getApiUrl('DELETE_IP_GROUP')}/${groupId}`),

  // Access Control Analytics
  getAccessControlAnalytics: () =>
    apiClient.get(getApiUrl('GET_ACCESS_CONTROL_ANALYTICS')),

  getPolicyStatistics: () =>
    apiClient.get(getApiUrl('GET_POLICY_STATISTICS')),
};

export default api;
