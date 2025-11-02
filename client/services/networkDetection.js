/**
 * Detects if the application is being accessed from a local/private network
 * based on the browser's current hostname.
 * 
 * @returns {boolean} true if accessing from local network, false if cloud/public
 */
export function isLocalNetwork() {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname.toLowerCase();

  // Check for localhost variations
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  // Check for private IP ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  if (
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    return true;
  }

  // Check for .local domains (common in local networks)
  if (hostname.endsWith('.local')) {
    return true;
  }

  return false;
}

/**
 * Gets detailed network environment information
 * 
 * @returns {Object} Environment details including hostname, origin, and network type
 */
export function getNetworkEnvironment() {
  if (typeof window === 'undefined') {
    return {
      hostname: 'unknown',
      origin: 'unknown',
      isLocal: false,
      networkType: 'cloud'
    };
  }

  const hostname = window.location.hostname;
  const origin = window.location.origin;
  const isLocal = isLocalNetwork();

  return {
    hostname,
    origin,
    isLocal,
    networkType: isLocal ? 'local' : 'cloud'
  };
}
