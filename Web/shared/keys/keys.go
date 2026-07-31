// Package keys is the single source of truth for Redis cache keys, queue names
// and DNS query status labels shared across NexoralDNS services.
package keys

import "fmt"

// Cache keys.
const (
	ServiceStatus           = "dns-server-status"
	DomainDNSRecord         = "Domain_DNS_Record"
	DNSQueryDetailsStore    = "DNS_QUERY"
	DashboardAnaliticalData = "DashboardAnaliticalDataStats"
)

// ACL key scheme. Writer and readers share these so the layout is defined once.
const (
	ACLExactGlobal = "acl:all_users:exact"
	ACLWildGlobal  = "acl:all_users:wild"
	ACLMetadata    = "acl:metadata"
)

func ACLExactIP(ip string) string { return fmt.Sprintf("acl:ip:%s:exact", ip) }
func ACLWildIP(ip string) string  { return fmt.Sprintf("acl:ip:%s:wild", ip) }

// Queue names.
const (
	QueueDNSAnalytics = "DNS_analytics"
	QueueLogsExport   = "logs_export"
)

// DNS query status labels published with analytics events.
const (
	StatusFromDB        = "FROM DB"
	StatusFromCache     = "FROM REDIS CACHE"
	StatusResolved      = "RESOLVED"
	StatusNotFound      = "DOMAIN NOT FOUND"
	StatusForwarded     = "DNS REQUEST FORWARDED"
	StatusFailed        = "FAILED TO PROCESS"
	StatusServiceDown   = "SERVICE_DOWN"
	StatusServiceDownFr = "SYSTEM"
	StatusForwardedStat = "FORWARDED"
	StatusBlocked       = "BLOCKED"
	StatusFromBlocked   = "BY RULE"
	StatusFailSafe      = "RESOLVED (FAIL-SAFE)"
	StatusFromFailSafe  = "FAIL-SAFE BYPASS"
)
