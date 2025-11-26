enum CacheKeys {
  Service_Status = "dns-server-status",
  Domain_DNS_Record = "Domain_DNS_Record",
  Block_Domains = "Blocked_Domain",
  DnsQueryDetailsStore = "DNS_QUERY",
  DashboardAnaliticalData = "DashboardAnaliticalDataStats"
}

export enum QueueKeys {
  DNS_Analytics = "DNS_analytcs"
}

export enum DNS_QUERY_STATUS_KEYS {
  FROM_DB = "FROM DB",
  FROM_CACHE = "FROM REDIS CACHE",
  RESOLVED = "RESOLVED",
  NOT_FOUND = "DOMAIN NOT FOUND",
  FORWARDED = "DNS REQUESTED FORWARDED",
  FAILED = "FAILED TO PROCESS"

}

export default CacheKeys;