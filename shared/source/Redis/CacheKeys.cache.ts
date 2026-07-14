enum CacheKeys {
  Service_Status = "dns-server-status",
  Domain_DNS_Record = "Domain_DNS_Record",
  DnsQueryDetailsStore = "DNS_QUERY",
  DashboardAnaliticalData = "DashboardAnaliticalDataStats"
}

// Single source of truth for the ACL key scheme - writer and readers previously each hardcoded their own copy
export const ACLKeys = {
  exactIp: (ip: string): string => `acl:ip:${ip}:exact`,
  wildIp: (ip: string): string => `acl:ip:${ip}:wild`,
  EXACT_GLOBAL: 'acl:all_users:exact',
  WILD_GLOBAL: 'acl:all_users:wild',
  METADATA: 'acl:metadata',
} as const;

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
