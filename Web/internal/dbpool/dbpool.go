// Package dbpool resolves DNS records from MongoDB, following CNAME chains.
package dbpool

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"nexoraldns/web/internal/config"
	"nexoraldns/web/internal/database"
	"nexoraldns/web/internal/dnsmsg"
)

// hopCacheTTL is how long a single resolved hop stays cached.
//
// This caches individual hops, not the finished chain — the rules service
// already caches that in Redis — so a hop shared by several chains is fetched
// from Mongo once.
const hopCacheTTL = 3 * time.Second

// maxCNAMEDepth bounds how many CNAME hops a single lookup will follow.
const maxCNAMEDepth = 10

var ErrCircularCNAME = errors.New("circular CNAME reference")

type cacheEntry struct {
	record    dnsmsg.Record
	expiresAt time.Time
}

// Service walks the dns_records collection. Its hop cache is shared by every
// query goroutine, so it is guarded for concurrent use.
type Service struct {
	collections database.CollectionSource

	mu       sync.RWMutex
	hopCache map[string]cacheEntry
}

func NewService(collections database.CollectionSource) *Service {
	return &Service{collections: collections, hopCache: map[string]cacheEntry{}}
}

// Resolve follows the record chain for domainName and returns the terminal
// record, relabelled with the originally requested name. Returns nil when no
// record exists.
func (s *Service) Resolve(ctx context.Context, domainName string) (*dnsmsg.Record, error) {
	collection := s.collections.Collection(config.CollectionDNSRecords)

	currentName := domainName
	visited := make(map[string]struct{}, 2)

	for range maxCNAMEDepth {
		if _, seen := visited[currentName]; seen {
			return nil, fmt.Errorf("%w for %s", ErrCircularCNAME, domainName)
		}
		visited[currentName] = struct{}{}

		record, err := s.lookupHop(ctx, collection, currentName)
		if err != nil {
			return nil, err
		}
		if record == nil {
			return nil, nil
		}

		if record.Type == "CNAME" {
			currentName = record.Value
			continue
		}

		// A, AAAA and everything else terminate the walk.
		resolved := *record
		resolved.Name = domainName
		return &resolved, nil
	}

	return nil, fmt.Errorf("maximum CNAME depth exceeded for %s", domainName)
}

func (s *Service) lookupHop(ctx context.Context, collection database.DocFinder, name string) (*dnsmsg.Record, error) {
	s.mu.RLock()
	cached, found := s.hopCache[name]
	s.mu.RUnlock()
	if found && cached.expiresAt.After(time.Now()) {
		return &cached.record, nil
	}

	if collection == nil {
		return nil, errors.New("dns_records collection unavailable")
	}

	var record dnsmsg.Record
	err := collection.FindOne(ctx, bson.M{"name": name}, &record)
	if errors.Is(err, database.ErrNoDocuments) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	s.hopCache[name] = cacheEntry{record: record, expiresAt: time.Now().Add(hopCacheTTL)}
	if len(s.hopCache) > 10000 {
		s.evictExpiredLocked()
	}
	s.mu.Unlock()

	return &record, nil
}

// evictExpiredLocked drops stale entries. The caller must hold the write lock.
func (s *Service) evictExpiredLocked() {
	now := time.Now()
	for key, entry := range s.hopCache {
		if entry.expiresAt.Before(now) {
			delete(s.hopCache, key)
		}
	}
}
