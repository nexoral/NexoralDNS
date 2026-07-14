enum CacheKeys {
  Service_Status = "dns-server-status",
  Domain_DNS_Record = "Domain_DNS_Record",
  DnsQueryDetailsStore = "DNS_QUERY",
  DashboardAnaliticalData = "DashboardAnaliticalDataStats",
  ACL_All_Users = "acl:all_users",
  ACL_Metadata = "acl:metadata"
}

/**
 * Helper for a single-key ACL representation. Not used by AclBlockingService's
 * exact/wild split scheme (acl:ip:{ip}:exact / acl:ip:{ip}:wild) — kept for
 * backward compatibility with existing exports, currently unreferenced.
 * @param ip IP address
 * @returns Redis key for IP-specific blocked domains
 */
export const getACLKeyForIP = (ip: string): string => `acl:ip:${ip}`;

export enum QueueKeys {
  DNS_Analytics = "DNS_analytics",
  LOGS_EXPORT = "logs_export"
}

export enum DNS_QUERY_STATUS_KEYS {
  FROM_DB = "FROM DB",
  FROM_CACHE = "FROM REDIS CACHE",
  RESOLVED = "RESOLVED",
  NOT_FOUND = "DOMAIN NOT FOUND",
  FORWARDED = "DNS REQUEST FORWARDED",
  FAILED = "FAILED TO PROCESS",
  SERVICE_DOWN = "SERVICE_DOWN",
  SERVICE_DOWN_FROM = "SYSTEM",
  FORWARDED_STATUS = "FORWARDED",
  BLOCKED = "BLOCKED",
  FROM_BLOCKED = "BY RULE",
  FAIL_SAFE = "RESOLVED (FAIL-SAFE)",
  FROM_FAIL_SAFE = "FAIL-SAFE BYPASS"
}

export default CacheKeys;
