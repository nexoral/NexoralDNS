import apiClient from './apiClient';
import { getApiUrl } from '../config/keys';

// API Service Layer - Centralized API calls
export const api = {
  // Authentication
  login: (credentials) =>
    apiClient.post(getApiUrl('LOGIN'), credentials),

  verifyToken: () =>
    apiClient.get(getApiUrl('VERIFY_TOKEN')),

  // Domain Management
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
};

export default api;
