// Package rules implements the DNS query pipeline: service status, access
// control, record resolution and upstream fallback.
package rules

import (
	"context"
	"fmt"
	"maps"
	"slices"
	"strings"
	"sync"
	"time"

	"nexoraldns/web/internal/cache"
	"nexoraldns/web/shared/logger"
)

// blockCacheTTL is how long an access-control verdict is trusted in memory.
//
// The TypeScript kept two maps, a 3s "global" and a 5s per-instance one, but
// both were written together on the same singleton, so a lookup hit whenever the
// entry was under 5s old. One map with that TTL is the same behaviour.
const blockCacheTTL = 5 * time.Second

// blockCacheMaxEntries triggers a sweep of expired entries.
const blockCacheMaxEntries = 10000

type blockVerdict struct {
	blocked  bool
	cachedAt time.Time
}

// BlockList answers access-control questions for a client and domain, backed by
// Redis and fronted by an in-memory cache.
//
// Lookups are served from memory in microseconds, from Redis in about a
// millisecond. Any error fails open — allowing the query — so a cache outage
// cannot block all traffic.
type BlockList struct {
	cache *cache.Service

	mu       sync.RWMutex
	verdicts map[string]blockVerdict
}

func NewBlockList(cacheService *cache.Service) *BlockList {
	return &BlockList{cache: cacheService, verdicts: map[string]blockVerdict{}}
}

// ClearCaches drops every in-memory verdict, e.g. after a policy change.
func (b *BlockList) ClearCaches() {
	b.mu.Lock()
	clear(b.verdicts)
	b.mu.Unlock()
	logger.Info("[BlockList] Cleared all in-memory caches")
}

// CheckDomain reports whether domain should be blocked for clientIP.
//
// It never reports an error: a lookup failure fails open, allowing the query.
// The caller must keep treating the rest of the pipeline as healthy, so a Redis
// outage costs access control only — records are still served from MongoDB.
func (b *BlockList) CheckDomain(ctx context.Context, domain, clientIP string) bool {
	normalized := strings.ToLower(domain)
	key := clientIP + ":" + normalized

	b.mu.RLock()
	cached, found := b.verdicts[key]
	b.mu.RUnlock()
	if found && time.Since(cached.cachedAt) < blockCacheTTL {
		return cached.blocked
	}

	blocked, err := b.cache.IsDomainBlocked(ctx, clientIP, normalized)
	if err != nil {
		logger.Error(fmt.Sprintf("[ACL] Error checking domain %s for IP %s:", normalized, clientIP), err)
		return false
	}

	b.mu.Lock()
	b.verdicts[key] = blockVerdict{blocked: blocked, cachedAt: time.Now()}
	if len(b.verdicts) > blockCacheMaxEntries {
		b.evictExpiredLocked()
	}
	b.mu.Unlock()

	return blocked
}

// CheckDomainWithDetails reports the verdict alongside its reason.
func (b *BlockList) CheckDomainWithDetails(ctx context.Context, domain, clientIP string) (blocked bool, reason string, checkedAt time.Time) {
	blocked = b.CheckDomain(ctx, strings.ToLower(domain), clientIP)
	if blocked {
		reason = "Access Control Policy"
	}
	return blocked, reason, time.Now()
}

// BlockedDomainsForClient lists every pattern blocking this client, for
// debugging and diagnostics.
func (b *BlockList) BlockedDomainsForClient(ctx context.Context, clientIP string) []string {
	unique := map[string]struct{}{}
	for _, domain := range b.cache.BlockedDomainsForIP(ctx, clientIP) {
		unique[domain] = struct{}{}
	}
	for _, domain := range b.cache.GloballyBlockedDomains(ctx) {
		unique[domain] = struct{}{}
	}
	return slices.Collect(maps.Keys(unique))
}

// ACLStats returns the ACL loader's metadata.
func (b *BlockList) ACLStats(ctx context.Context) map[string]any {
	return b.cache.ACLMetadata(ctx)
}

// CheckDomainsBatch resolves many domains for one client concurrently.
func (b *BlockList) CheckDomainsBatch(ctx context.Context, domains []string, clientIP string) map[string]bool {
	results := make(map[string]bool, len(domains))

	var mu sync.Mutex
	var wg sync.WaitGroup
	for _, domain := range domains {
		wg.Add(1)
		go func() {
			defer wg.Done()
			blocked := b.CheckDomain(ctx, domain, clientIP)
			mu.Lock()
			results[domain] = blocked
			mu.Unlock()
		}()
	}
	wg.Wait()

	return results
}

// evictExpiredLocked drops stale verdicts. The caller must hold the write lock.
func (b *BlockList) evictExpiredLocked() {
	now := time.Now()
	for key, verdict := range b.verdicts {
		if now.Sub(verdict.cachedAt) > blockCacheTTL {
			delete(b.verdicts, key)
		}
	}
}
