package rules

import (
	"context"
	"fmt"
	"runtime/debug"
	"time"

	"golang.org/x/sync/singleflight"

	"nexoraldns/webgo/internal/cache"
	"nexoraldns/webgo/internal/dbpool"
	"nexoraldns/webgo/internal/dnsio"
	"nexoraldns/webgo/internal/dnsmsg"
	"nexoraldns/webgo/internal/forwarder"
	"nexoraldns/webgo/shared/keys"
	"nexoraldns/webgo/shared/logger"
	"nexoraldns/webgo/shared/rabbitmq"
)

// queryTimeout bounds the whole pipeline for one query.
const queryTimeout = 5 * time.Second

// invalidateChannel is the Redis channel that signals a policy change.
const invalidateChannel = "cache:invalidate"

// analytics is one query's telemetry record.
type analytics struct {
	QueryName string  `json:"queryName"`
	QueryType string  `json:"queryType"`
	Timestamp int64   `json:"timestamp"`
	SourceIP  string  `json:"SourceIP"`
	Status    string  `json:"Status"`
	From      string  `json:"From"`
	Duration  float64 `json:"duration"`
}

// StartRules runs the query pipeline: service status, then access control, then
// the local record store, then upstream forwarding.
//
// One instance is shared by every transport. Concurrent queries for the same
// name collapse into a single database read.
type StartRules struct {
	blockList     *BlockList
	statusChecker *ServiceStatusChecker
	dbPool        *dbpool.Service
	cache         *cache.Service
	rabbit        *rabbitmq.Service
	forwarder     *forwarder.Service

	inflight singleflight.Group
}

func NewStartRules(
	blockList *BlockList,
	statusChecker *ServiceStatusChecker,
	dbPool *dbpool.Service,
	cacheService *cache.Service,
	rabbit *rabbitmq.Service,
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
		s.cache.Delete(context.Background(), keys.ServiceStatus)

		logger.Info("✅ Local Caches Cleared")
	})
	if err != nil {
		logger.Error("❌ Failed to subscribe to cache:invalidate channel:", err)
	}
}

// recoverQuery contains a panic to the single query that caused it.
//
// The Node build got this isolation from cluster: a throw killed one worker and
// the primary forked a replacement. This build is one process, so an unrecovered
// panic would take down every listener at once. Containing it at the query
// boundary is strictly better than the old behaviour — the other in-flight
// queries are not dropped either.
func recoverQuery(clientIP string) {
	if r := recover(); r != nil {
		logger.Error(fmt.Sprintf("Recovered from panic handling query from %s: %v\n%s",
			clientIP, r, debug.Stack()))
	}
}

// Execute answers one query, bounded by queryTimeout.
func (s *StartRules) Execute(ctx context.Context, msg []byte, rinfo dnsio.RemoteInfo, io dnsio.Handler) {
	defer recoverQuery(rinfo.Address)

	if len(msg) == 0 {
		return
	}

	start := time.Now()

	ctx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	done := make(chan struct{})
	go func() {
		// A panic cannot cross goroutines, so this one needs its own guard.
		// Deferred calls unwind last-first: recover runs, then done closes and
		// Execute returns normally.
		defer close(done)
		defer recoverQuery(rinfo.Address)
		s.executeCore(ctx, msg, rinfo, io, start)
	}()

	select {
	case <-done:
	case <-ctx.Done():
		logger.Error(fmt.Sprintf("Query timeout for %s from %s", io.ParseQueryName(msg), rinfo.Address))
		io.BuildSendAnswer(msg, rinfo, "", "0.0.0.0", 0)
	}
}

func (s *StartRules) executeCore(
	ctx context.Context,
	msg []byte,
	rinfo dnsio.RemoteInfo,
	io dnsio.Handler,
	start time.Time,
) {
	queryName := io.ParseQueryName(msg)
	queryType := io.ParseQueryType(msg)

	logger.Info(fmt.Sprintf("DNS Query: %s (%s) from %s", queryName, queryType, rinfo.Address))

	event := analytics{
		QueryName: queryName,
		QueryType: queryType,
		SourceIP:  rinfo.Address,
		Timestamp: time.Now().UnixMilli(),
	}

	// Layer 1 — service status. A failure here means the database is unreachable,
	// so the fail-safe path bypasses every access control below rather than
	// black-holing all DNS on the network.
	databaseOffline := false
	status, err := s.statusChecker.Check(ctx, queryName, io, msg, rinfo)
	switch {
	case err != nil:
		logger.Warn(fmt.Sprintf("Fail-Safe Active: Database offline for query %s. Bypassing access controls.", queryName))
		databaseOffline = true
		status = ServiceStatusResult{Active: true}

	case !status.Active:
		event.Status = keys.StatusServiceDown
		event.From = keys.StatusServiceDownFr
		event.Duration = millisSince(start)
		s.publishAnalytics(event)
		return
	}

	defaultTTL := DefaultTTL(status.Config)

	// Layer 2 — access control. A lookup failure fails open rather than marking
	// the database offline, so a Redis outage still leaves records resolvable
	// from MongoDB below.
	if !databaseOffline && s.blockList.CheckDomain(ctx, queryName, rinfo.Address) {
		event.Status = keys.StatusBlocked
		event.From = keys.StatusFromBlocked
		event.Duration = millisSince(start)

		io.BuildSendAnswer(msg, rinfo, queryName, "0.0.0.0", defaultTTL)
		s.publishAnalytics(event)
		return
	}

	// Layer 3 — local record, from Redis first and MongoDB second.
	var record *dnsmsg.Record
	if !databaseOffline {
		record, err = s.lookupRecord(ctx, queryName, &event)
		if err != nil {
			databaseOffline = true
			logger.Warn("Fail-Safe Active: Cache/DB record lookup failed. Bypassing.")
		}
	}

	if !databaseOffline && record != nil && record.Name == queryName {
		event.Status = keys.StatusResolved
		event.Duration = millisSince(start)

		sent := io.BuildSendAnswer(msg, rinfo, record.Name, record.Value, record.TTL)
		s.publishAnalytics(event)

		if !sent {
			event.Status = keys.StatusFailed
			event.Duration = millisSince(start)
			s.publishAnalytics(event)
			logger.Error(fmt.Sprintf("Failed to respond to %s", queryName))
		}
		return
	}

	// Layer 4 — upstream fallback.
	if !databaseOffline {
		event.From = "Upstream"
	}
	s.forwardUpstream(ctx, msg, rinfo, io, queryName, queryType, defaultTTL, start, databaseOffline, event)
}

// lookupRecord reads the record from cache, falling back to the database.
// Concurrent lookups for the same name share one database read.
func (s *StartRules) lookupRecord(ctx context.Context, queryName string, event *analytics) (*dnsmsg.Record, error) {
	cacheKey := keys.DomainDNSRecord + ":" + queryName

	var cached dnsmsg.Record
	if s.cache.Get(ctx, cacheKey, &cached) && cached.Name != "" {
		event.From = keys.StatusFromCache
		return &cached, nil
	}

	resolved, err, _ := s.inflight.Do(queryName, func() (any, error) {
		return s.dbPool.Resolve(ctx, queryName)
	})
	if err != nil {
		logger.Warn(fmt.Sprintf("Fail-Safe Active: DB query error for record %s. Bypassing.", queryName))
		return nil, err
	}

	record, _ := resolved.(*dnsmsg.Record)
	if record == nil {
		return nil, nil
	}

	event.From = keys.StatusFromDB
	// Fire-and-forget: the cache write must not delay the answer.
	go s.cache.Set(context.Background(), cacheKey, record, record.TTL)

	return record, nil
}

func (s *StartRules) forwardUpstream(
	ctx context.Context,
	msg []byte,
	rinfo dnsio.RemoteInfo,
	io dnsio.Handler,
	queryName, queryType string,
	defaultTTL uint32,
	start time.Time,
	databaseOffline bool,
	event analytics,
) {
	// Report the failure once, and only when analytics is meaningful — during a
	// fail-safe bypass the database that would receive it is already down.
	fail := func(format string, args ...any) {
		if !databaseOffline {
			event.Status = keys.StatusFailed
			event.Duration = millisSince(start)
			s.publishAnalytics(event)
		}
		logger.Error(fmt.Sprintf(format, args...))
	}

	response := s.forwarder.Forward(ctx, msg, queryName, queryType, &defaultTTL, rinfo, start, databaseOffline)
	if response == nil {
		fail("No response received from Global DNS for %s", queryName)
		io.BuildSendAnswer(msg, rinfo, queryName, "0.0.0.0", 0)
		return
	}

	if !io.SendRawAnswer(response, rinfo) {
		fail("Failed to forward %s to Global DNS", queryName)
	}
}

// publishAnalytics is fire-and-forget. Analytics is best-effort and must never
// block or delay a DNS answer, even when the broker is down.
func (s *StartRules) publishAnalytics(event analytics) {
	go func() {
		s.rabbit.Publish(context.Background(), keys.QueueDNSAnalytics, event, &rabbitmq.PublishOptions{
			Persistent: rabbitmq.Persistent(false),
			Priority:   rabbitmq.Priority(5),
		})
	}()
}

// millisSince reports elapsed time in fractional milliseconds, matching the
// resolution the analytics consumer expects.
func millisSince(start time.Time) float64 {
	return float64(time.Since(start).Microseconds()) / 1000
}
