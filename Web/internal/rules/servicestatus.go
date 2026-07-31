package rules

import (
	"context"
	"errors"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"nexoraldns/web/internal/cache"
	"nexoraldns/web/internal/config"
	"nexoraldns/web/internal/database"
	"nexoraldns/web/internal/dnsio"
	"nexoraldns/web/shared/keys"
	"nexoraldns/web/shared/logger"
)

// ErrServiceConfigMissing signals the service document could not be read, which
// the pipeline treats as "database offline" and bypasses access controls for.
var ErrServiceConfigMissing = errors.New("service config missing — database offline")

// ServiceStatusResult carries whether DNS processing may continue, plus the
// service configuration document it was decided from.
type ServiceStatusResult struct {
	Active bool
	Config map[string]any
}

// statusMemoTTL is how long the service document is trusted in memory.
//
// Every query passes through this gate, so without a local memo each one costs
// a Redis round trip for a value that changes only when an operator flips the
// service on or off. The same 5s window BlockList uses for its verdicts.
const statusMemoTTL = 5 * time.Second

// ServiceStatusChecker gates the whole query pipeline on the service being
// switched on, reading from memory first, then Redis, then MongoDB.
type ServiceStatusChecker struct {
	cache       *cache.Service
	collections database.CollectionSource

	mu     sync.RWMutex
	memo   map[string]any
	memoAt time.Time
}

func NewServiceStatusChecker(cacheService *cache.Service, collections database.CollectionSource) *ServiceStatusChecker {
	return &ServiceStatusChecker{cache: cacheService, collections: collections}
}

// memoized returns the in-memory service document while it is still fresh.
func (s *ServiceStatusChecker) memoized() map[string]any {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.memo == nil || time.Since(s.memoAt) >= statusMemoTTL {
		return nil
	}
	return s.memo
}

func (s *ServiceStatusChecker) memoize(serviceConfig map[string]any) {
	s.mu.Lock()
	s.memo, s.memoAt = serviceConfig, time.Now()
	s.mu.Unlock()
}

// ClearMemo drops the remembered document so the next query re-reads it.
// Called when a policy change is broadcast, so switching the service off takes
// effect immediately instead of after the memo lapses.
func (s *ServiceStatusChecker) ClearMemo() {
	s.mu.Lock()
	s.memo = nil
	s.mu.Unlock()
}

// Check reports whether the service is active. When it is not, the caller's
// query is answered with 0.0.0.0 before returning.
func (s *ServiceStatusChecker) Check(
	ctx context.Context,
	queryName string,
	io dnsio.Handler,
	msg []byte,
	rinfo dnsio.RemoteInfo,
) (ServiceStatusResult, error) {
	// Fastest path: the document this process read moments ago.
	if memo := s.memoized(); memo != nil {
		return s.decide(memo, queryName, io, msg, rinfo, true), nil
	}

	var cached map[string]any
	if s.cache.Get(ctx, keys.ServiceStatus, &cached) && cached != nil {
		s.memoize(cached)
		return s.decide(cached, queryName, io, msg, rinfo, true), nil
	}

	collection := s.collections.Collection(config.CollectionService)
	if collection == nil {
		logger.Error("Service collection not found in the database.")
		return ServiceStatusResult{}, ErrServiceConfigMissing
	}

	var serviceConfig map[string]any
	err := collection.FindOne(ctx, bson.M{"SERVICE_NAME": config.ServiceName}, &serviceConfig)
	if err != nil || serviceConfig == nil {
		logger.Error("Service configuration not found in the database.")
		return ServiceStatusResult{}, ErrServiceConfigMissing
	}

	s.cache.Set(ctx, keys.ServiceStatus, serviceConfig, 60)
	s.memoize(serviceConfig)

	return s.decide(serviceConfig, queryName, io, msg, rinfo, false), nil
}

// decide turns a service document into a verdict, answering the query with
// 0.0.0.0 when the service is switched off.
//
// A document that came from memory or Redis answers with a fixed 10s TTL; one
// read straight from MongoDB uses the TTL the document itself carries.
func (s *ServiceStatusChecker) decide(
	serviceConfig map[string]any,
	queryName string,
	io dnsio.Handler,
	msg []byte,
	rinfo dnsio.RemoteInfo,
	fromCache bool,
) ServiceStatusResult {
	if status, _ := serviceConfig["Service_Status"].(string); status == "active" {
		return ServiceStatusResult{Active: true, Config: serviceConfig}
	}

	ttl := DefaultTTL(serviceConfig)
	if fromCache {
		logger.Error("Service is inactive (from cache). DNS query processing is halted.")
		ttl = 10
	} else {
		logger.Error("Service is inactive. DNS query processing is halted.")
	}

	io.BuildSendAnswer(msg, rinfo, queryName, "0.0.0.0", ttl)
	return ServiceStatusResult{Active: false, Config: serviceConfig}
}

// DefaultTTL reads DefaultTTL off the service document, defaulting to 0.
//
// The value arrives as an int from MongoDB but as a float64 after a JSON
// round-trip through Redis, so every numeric shape is accepted.
func DefaultTTL(serviceConfig map[string]any) uint32 {
	if serviceConfig == nil {
		return 0
	}
	switch v := serviceConfig["DefaultTTL"].(type) {
	case float64:
		if v > 0 {
			return uint32(v)
		}
	case int32:
		if v > 0 {
			return uint32(v)
		}
	case int64:
		if v > 0 {
			return uint32(v)
		}
	case int:
		if v > 0 {
			return uint32(v)
		}
	}
	return 0
}
