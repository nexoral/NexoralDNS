enum CacheKeys {
  Service_Status = "dns-server-status",
  Domain_DNS_Record = "Domain_DNS_Record",
  Block_Domains = "Blocked_Domain",
  DnsQueryDetailsStore = "DNS_QUERY"
}

export function dnsQueryDetailsKey(suffix?: number | string) {
  const now = new Date();

  // Format YYYY-MM-DD
  const dateStr = now.toISOString().split("T")[0];

  // Build Redis key
  const QUERY =
    suffix !== undefined
      ? `DNS_QUERY:${dateStr}:${suffix}`
      : `DNS_QUERY:${dateStr}`;

  // Calculate TTL until next midnight (12:00 AM)
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // today 24:00 = tomorrow 00:00

  const TTL = Math.floor((midnight.getTime() - now.getTime()) / 1000); // in seconds

  return { QUERY, TTL };
}

export default CacheKeys;