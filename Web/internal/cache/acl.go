// Package cache wraps Redis for the DNS path: record caching, cache
// invalidation pub/sub, and the access-control (blocklist) lookups.
package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"nexoraldns/web/shared/keys"
	"nexoraldns/web/shared/logger"
	sharedredis "nexoraldns/web/shared/redis"
)

// ACLService answers "is this domain blocked for this client" from the ACL sets
// a cron job maintains in Redis. Every failure is treated as "not blocked" so a
// Redis outage cannot black-hole all DNS traffic.
type ACLService struct {
	conn *sharedredis.ConnectionManager
}

func NewACLService(conn *sharedredis.ConnectionManager) *ACLService {
	return &ACLService{conn: conn}
}

func (a *ACLService) BlockedDomainsForIP(ctx context.Context, ip string) []string {
	client, err := a.conn.Client(ctx)
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to get blocked domains for IP %s:", ip), err)
		return nil
	}

	exact, err := client.SMembers(ctx, keys.ACLExactIP(ip)).Result()
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to get blocked domains for IP %s:", ip), err)
		return nil
	}
	wild, err := client.SMembers(ctx, keys.ACLWildIP(ip)).Result()
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to get blocked domains for IP %s:", ip), err)
		return nil
	}
	return append(exact, wild...)
}

func (a *ACLService) GloballyBlockedDomains(ctx context.Context) []string {
	client, err := a.conn.Client(ctx)
	if err != nil {
		logger.Warn("⚠️  Failed to get globally blocked domains:", err)
		return nil
	}

	exact, err := client.SMembers(ctx, keys.ACLExactGlobal).Result()
	if err != nil {
		logger.Warn("⚠️  Failed to get globally blocked domains:", err)
		return nil
	}
	wild, err := client.SMembers(ctx, keys.ACLWildGlobal).Result()
	if err != nil {
		logger.Warn("⚠️  Failed to get globally blocked domains:", err)
		return nil
	}
	return append(exact, wild...)
}

func (a *ACLService) Metadata(ctx context.Context) map[string]any {
	client, err := a.conn.Client(ctx)
	if err != nil {
		logger.Warn("⚠️  Failed to get ACL metadata:", err)
		return nil
	}

	raw, err := client.Get(ctx, keys.ACLMetadata).Result()
	if err != nil || raw == "" {
		return nil
	}

	var metadata map[string]any
	if err := json.Unmarshal([]byte(raw), &metadata); err != nil {
		logger.Warn("⚠️  Failed to get ACL metadata:", err)
		return nil
	}
	return metadata
}

// IsDomainBlocked checks the client's own rules and the global rules together.
func (a *ACLService) IsDomainBlocked(ctx context.Context, ip, domain string) (bool, error) {
	client, err := a.conn.Client(ctx)
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to check if domain %s is blocked for IP %s:", domain, ip), err)
		return false, err
	}

	// Fast path: O(1) exact-match membership tests, no full-set fetch or scan.
	ipExact, err := client.SIsMember(ctx, keys.ACLExactIP(ip), domain).Result()
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to check if domain %s is blocked for IP %s:", domain, ip), err)
		return false, err
	}
	globalExact, err := client.SIsMember(ctx, keys.ACLExactGlobal, domain).Result()
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to check if domain %s is blocked for IP %s:", domain, ip), err)
		return false, err
	}
	if ipExact || globalExact {
		return true, nil
	}

	// Slow path: only the (typically small) wildcard sets are scanned.
	ipWild, err := client.SMembers(ctx, keys.ACLWildIP(ip)).Result()
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to check if domain %s is blocked for IP %s:", domain, ip), err)
		return false, err
	}
	globalWild, err := client.SMembers(ctx, keys.ACLWildGlobal).Result()
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to check if domain %s is blocked for IP %s:", domain, ip), err)
		return false, err
	}

	for _, entry := range ipWild {
		if matchesWildcard(entry, domain) {
			return true, nil
		}
	}
	for _, entry := range globalWild {
		if matchesWildcard(entry, domain) {
			return true, nil
		}
	}
	return false, nil
}

// matchesWildcard applies one stored wildcard entry to a domain. Matching is
// boundary-aware: a rule blocks a domain and its subdomains, never a look-alike
// domain that merely shares a prefix or suffix.
func matchesWildcard(rawEntry, domain string) bool {
	blocked := rawEntry
	var decoded struct {
		Domain string `json:"domain"`
	}
	if json.Unmarshal([]byte(rawEntry), &decoded) == nil && decoded.Domain != "" {
		blocked = decoded.Domain
	}

	if blocked == "*" {
		return true // full-internet block
	}

	if base, found := strings.CutPrefix(blocked, "*."); found {
		// "*.example.com" blocks example.com and its subdomains, not notexample.com.
		return domain == base || strings.HasSuffix(domain, "."+base)
	}

	if prefix, found := strings.CutSuffix(blocked, ".*"); found {
		// "google.*" blocks google.com and google.co.uk, not googlexyz.com.
		return domain == prefix || strings.HasPrefix(domain, prefix+".")
	}

	// A bare domain stored as a wildcard covers the domain and its subdomains.
	return domain == blocked || strings.HasSuffix(domain, "."+blocked)
}
