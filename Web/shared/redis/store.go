package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	goredis "github.com/redis/go-redis/v9"

	"nexoraldns/web/shared/logger"
)

// CacheStore is the key/value cache API over the shared Redis client. Every
// operation degrades to a miss rather than an error so the DNS path never fails
// because the cache is unavailable.
type CacheStore struct {
	conn *ConnectionManager
}

func NewCacheStore(conn *ConnectionManager) *CacheStore { return &CacheStore{conn: conn} }

// Set stores value as JSON (strings are stored verbatim).
//
// A ttl of 0 or less floors to 1s rather than skipping the write or persisting
// forever: persisting without expiry would serve stale records indefinitely and
// defeat invalidation, while never caching defeats the point of the cache.
func (s *CacheStore) Set(ctx context.Context, key string, value any, ttl uint32) {
	client, err := s.conn.Client(ctx)
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to set key %s:", key), err)
		return
	}

	var payload string
	switch v := value.(type) {
	case string:
		payload = v
	default:
		encoded, err := json.Marshal(v)
		if err != nil {
			logger.Warn(fmt.Sprintf("⚠️  Failed to set key %s:", key), err)
			return
		}
		payload = string(encoded)
	}

	effective := ttl
	if effective == 0 {
		effective = 1
	}
	if err := client.Set(ctx, key, payload, time.Duration(effective)*time.Second).Err(); err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to set key %s:", key), err)
	}
}

// Get decodes the cached JSON into dest. Returns false on a miss or any error.
func (s *CacheStore) Get(ctx context.Context, key string, dest any) bool {
	client, err := s.conn.Client(ctx)
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to get key %s:", key), err)
		return false
	}

	cached, err := client.Get(ctx, key).Result()
	if err == goredis.Nil {
		return false
	}
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to get key %s:", key), err)
		return false
	}
	if cached == "" {
		return false
	}
	return json.Unmarshal([]byte(cached), dest) == nil
}

func (s *CacheStore) Delete(ctx context.Context, key string) bool {
	client, err := s.conn.Client(ctx)
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to delete key %s:", key), err)
		return false
	}
	n, err := client.Del(ctx, key).Result()
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to delete key %s:", key), err)
		return false
	}
	return n > 0
}

func (s *CacheStore) Exists(ctx context.Context, key string) bool {
	client, err := s.conn.Client(ctx)
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to check existence of key %s:", key), err)
		return false
	}
	n, err := client.Exists(ctx, key).Result()
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to check existence of key %s:", key), err)
		return false
	}
	return n > 0
}

// Invalidate deletes every key matching pattern, scanning in batches of 100.
func (s *CacheStore) Invalidate(ctx context.Context, pattern string) int {
	client, err := s.conn.Client(ctx)
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to invalidate pattern %s:", pattern), err)
		return 0
	}

	var found []string
	var cursor uint64
	for {
		batch, next, err := client.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			logger.Warn(fmt.Sprintf("⚠️  Failed to invalidate pattern %s:", pattern), err)
			return 0
		}
		found = append(found, batch...)
		cursor = next
		if cursor == 0 {
			break
		}
	}

	if len(found) == 0 {
		return 0
	}
	if err := client.Del(ctx, found...).Err(); err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to invalidate pattern %s:", pattern), err)
		return 0
	}
	logger.Info(fmt.Sprintf("🗑️  Invalidated %d cache entries matching pattern: %s", len(found), pattern))
	return len(found)
}

func (s *CacheStore) TTL(ctx context.Context, key string) time.Duration {
	client, err := s.conn.Client(ctx)
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to get TTL for key %s:", key), err)
		return -1
	}
	ttl, err := client.TTL(ctx, key).Result()
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to get TTL for key %s:", key), err)
		return -1
	}
	return ttl
}

func (s *CacheStore) Expire(ctx context.Context, key string, seconds int) bool {
	client, err := s.conn.Client(ctx)
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to set expiration for key %s:", key), err)
		return false
	}
	ok, err := client.Expire(ctx, key, time.Duration(seconds)*time.Second).Result()
	if err != nil {
		logger.Warn(fmt.Sprintf("⚠️  Failed to set expiration for key %s:", key), err)
		return false
	}
	return ok
}

func (s *CacheStore) FlushAll(ctx context.Context) {
	client, err := s.conn.Client(ctx)
	if err != nil {
		logger.Error("❌ Failed to clear cache:", err)
		return
	}
	if err := client.FlushAll(ctx).Err(); err != nil {
		logger.Error("❌ Failed to clear cache:", err)
		return
	}
	logger.Info("✅ All cache cleared!")
}

// Stats reports the same subset of INFO fields the dashboard consumed.
func (s *CacheStore) Stats(ctx context.Context) map[string]string {
	client, err := s.conn.Client(ctx)
	if err != nil {
		logger.Error("❌ Failed to get cache stats:", err)
		return nil
	}
	info, err := client.Info(ctx).Result()
	if err != nil {
		logger.Error("❌ Failed to get cache stats:", err)
		return nil
	}

	fields := map[string]string{}
	for line := range strings.SplitSeq(info, "\r\n") {
		key, value, found := strings.Cut(line, ":")
		if found && key != "" && value != "" {
			fields[key] = value
		}
	}

	return map[string]string{
		"connected_clients":        fields["connected_clients"],
		"used_memory":              fields["used_memory_human"],
		"used_memory_peak":         fields["used_memory_peak_human"],
		"total_commands_processed": fields["total_commands_processed"],
		"keyspace_hits":            fields["keyspace_hits"],
		"keyspace_misses":          fields["keyspace_misses"],
		"hit_rate":                 hitRate(fields["keyspace_hits"], fields["keyspace_misses"]),
	}
}

func hitRate(hits, misses string) string {
	h, _ := strconv.Atoi(hits)
	m, _ := strconv.Atoi(misses)
	if h+m == 0 {
		return "0%"
	}
	return fmt.Sprintf("%.2f%%", float64(h)/float64(h+m)*100)
}
