// Client-side environment detection
// This checks if the server is running on a local/private network or in the cloud

import { api } from './api';

let cachedConfig = null;

export async function getEnvironmentConfig() {
  // Cache the result since it won't change during runtime
  if (cachedConfig) return cachedConfig;

  try {
    // Get the service info from the API which includes serverIP
    const response = await api.getServiceInfo();
    const result = response.data;

    if (result.statusCode === 200 && result.data?.serverIP) {
      const serverIP = result.data.serverIP;

      const isPrivate = false ||
        serverIP.startsWith('192.168.') ||
        serverIP.startsWith('10.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(serverIP) ||
        serverIP.startsWith('127.') ||
        serverIP === 'localhost';

      const location = isPrivate ? 'local' : 'cloud';
      cachedConfig = { serverIP, location, isPrivate };
      return cachedConfig;
    }
  } catch (error) {
    console.error('Failed to detect environment:', error);
  }

  // Default to cloud if detection fails (safer default)
  cachedConfig = { serverIP: 'unknown', location: 'cloud', isPrivate: false };
  return cachedConfig;
}

// Reset cache (useful for testing or if environment changes)
export function resetEnvironmentCache() {
  cachedConfig = null;
}