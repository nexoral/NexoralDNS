// Package redis owns the Redis client lifecycle, the cache store built on it,
// and the dedicated pub/sub subscriber connection.
package redis

import (
	"context"
	"os"
	"sync"
	"time"

	goredis "github.com/redis/go-redis/v9"

	"nexoraldns/webgo/shared/logger"
)

// ConnectionManager is a singleton owning the shared command client.
type ConnectionManager struct {
	mu     sync.Mutex
	client *goredis.Client
}

func NewConnectionManager() *ConnectionManager { return &ConnectionManager{} }

func redisURL() string {
	if v := os.Getenv("REDIS_URI"); v != "" {
		return v
	}
	return "redis://localhost:6379"
}

// Options builds the client options. Exported so the pub/sub subscriber can
// dial its own connection with exactly the same settings.
//
// The Node build used a custom reconnectStrategy (retries*50ms, capped at 500ms,
// giving up after 10 attempts). go-redis retries per command rather than per
// connection, so the equivalent is expressed as retry bounds here.
func Options() (*goredis.Options, error) {
	opts, err := goredis.ParseURL(redisURL())
	if err != nil {
		return nil, err
	}
	opts.MaxRetries = 10
	opts.MinRetryBackoff = 50 * time.Millisecond
	opts.MaxRetryBackoff = 500 * time.Millisecond
	opts.DialTimeout = 10 * time.Second
	return opts, nil
}

func (r *ConnectionManager) Connect(ctx context.Context) (*goredis.Client, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.client != nil {
		return r.client, nil
	}

	opts, err := Options()
	if err != nil {
		logger.Error("❌ Failed to connect to Redis:", err)
		return nil, err
	}

	logger.Info("📡 Connecting to Redis...")
	logger.Info("   Mode: standalone")

	client := goredis.NewClient(opts)
	if err := client.Ping(ctx).Err(); err != nil {
		logger.Error("❌ Failed to connect to Redis:", err)
		_ = client.Close()
		return nil, err
	}

	r.client = client
	logger.Info("✅ Connected to Redis successfully!")
	logger.Info("   Memory Policy: allkeys-lru")
	logger.Info("   Max Memory: 256MB")
	return client, nil
}

// Client returns the live client, connecting on first use.
func (r *ConnectionManager) Client(ctx context.Context) (*goredis.Client, error) {
	r.mu.Lock()
	c := r.client
	r.mu.Unlock()
	if c != nil {
		return c, nil
	}
	return r.Connect(ctx)
}

func (r *ConnectionManager) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.client == nil {
		return nil
	}
	logger.Info("🔌 Closing Redis connection...")
	err := r.client.Close()
	r.client = nil
	logger.Info("✅ Redis connection closed")
	return err
}
