// Package rules runs the query pipeline: service status, then access control,
// then the local record store, then upstream forwarding.
//
// The package is split by concern:
//
//	rules.go         — the StartRules type, its wiring and cache invalidation
//	pipeline.go      — the query path itself, layer by layer
//	analytics.go     — per-query telemetry, kept off the response path
//	servicestatus.go — layer 1, the on/off check and its 5s memo
//	blocklist.go     — layer 2, per-client domain access control
//
// One StartRules instance is shared by every transport (UDP, TCP, DoT), which is
// why it depends on the dnsio.Handler interface rather than any concrete socket.
package rules

import (
	"context"
	"fmt"

	"golang.org/x/sync/singleflight"

	"nexoraldns/web/internal/cache"
	"nexoraldns/web/internal/dbpool"
	"nexoraldns/web/internal/forwarder"
	"nexoraldns/web/shared/keys"
	"nexoraldns/web/shared/logger"
)

// invalidateChannel is the Redis channel that signals a policy change.
const invalidateChannel = "cache:invalidate"

// StartRules holds the collaborators for one query pipeline.
//
// Concurrent queries for the same name collapse into a single database read via
// the inflight group.
type StartRules struct {
	blockList     *BlockList
	statusChecker *ServiceStatusChecker
	dbPool        *dbpool.Service
	cache         *cache.Service
	rabbit        AnalyticsPublisher
	forwarder     *forwarder.Service

	inflight singleflight.Group
}

func NewStartRules(
	blockList *BlockList,
	statusChecker *ServiceStatusChecker,
	dbPool *dbpool.Service,
	cacheService *cache.Service,
	rabbit AnalyticsPublisher,
	fwd *forwarder.Service,
) *StartRules {
	return &StartRules{
		blockList:     blockList,
		statusChecker: statusChecker,
		dbPool:        dbPool,
		cache:         cacheService,
		rabbit:        rabbit,
		forwarder:     fwd,
	}
}

// SubscribeInvalidations clears the in-memory caches whenever a policy change is
// broadcast, so a rule edit takes effect without waiting for a TTL to lapse.
func (s *StartRules) SubscribeInvalidations(ctx context.Context) {
	err := s.cache.Subscribe(ctx, invalidateChannel, func(message string) {
		logger.Warn(fmt.Sprintf("🔔 Received Cache Invalidation Request: %s", message))

		s.blockList.ClearCaches()
		s.statusChecker.ClearMemo()
		s.cache.Delete(context.Background(), keys.ServiceStatus)

		logger.Info("✅ Local Caches Cleared")
	})
	if err != nil {
		logger.Error("❌ Failed to subscribe to cache:invalidate channel:", err)
	}
}
