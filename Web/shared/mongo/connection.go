// Package mongo owns the MongoDB client lifecycle: connect, health-check,
// reconnect-on-dead-client and close.
package mongo

import (
	"context"
	"os"

	"sync"
	"time"

	"go.mongodb.org/mongo-driver/v2/event"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"nexoraldns/web/shared/logger"
)

// ConnectionManager is a singleton; every caller shares one client and its pool.
type ConnectionManager struct {
	mu               sync.Mutex
	client           *mongo.Client
	connectionLogged bool
	uri              string
	dbName           string
}

func NewConnectionManager() *ConnectionManager {
	return &ConnectionManager{
		uri:    envOr("MONGO_URI", "mongodb://localhost:27017"),
		dbName: envOr("MONGO_DB_NAME", "nexoral_db"),
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// maxPoolSize is the connection budget for this process.
//
// The Node build forked one worker per 75% of CPUs and divided a 200-connection
// budget between them, so the deployment total landed near 200 under a 300 hard
// cap. This build is a single process, so it takes the whole budget in one pool —
// the same total load on MongoDB, not one worker's slice of it.
const maxPoolSize uint64 = 200

// Connect returns the live client, reconnecting if the existing one is dead.
func (m *ConnectionManager) Connect(ctx context.Context) (*mongo.Client, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.client != nil {
		pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		err := m.client.Ping(pingCtx, nil)
		cancel()
		if err == nil {
			return m.client, nil
		}
		// Dead connection — fall through and rebuild it.
	}

	logger.Info("📡 Connecting to MongoDB...")

	opts := options.Client().
		ApplyURI(m.uri).
		SetMaxPoolSize(maxPoolSize).
		SetConnectTimeout(5 * time.Second).
		SetServerSelectionTimeout(5 * time.Second).
		// v2 replaced socketTimeoutMS with a client-wide operation deadline.
		// A shorter per-query context (the 5s DNS budget) still wins.
		SetTimeout(30 * time.Second).
		SetPoolMonitor(m.poolMonitor())

	client, err := mongo.Connect(opts)
	if err != nil {
		logger.Error("❌ Failed to connect to MongoDB:", err)
		m.client = nil
		return nil, err
	}

	m.client = client
	logger.Info("✅ Connected to MongoDB successfully")
	return client, nil
}

func (m *ConnectionManager) poolMonitor() *event.PoolMonitor {
	return &event.PoolMonitor{
		Event: func(e *event.PoolEvent) {
			switch e.Type {
			case event.ConnectionCreated:
				m.mu.Lock()
				first := !m.connectionLogged
				m.connectionLogged = true
				m.mu.Unlock()
				if first {
					logger.Info("🟢 MongoDB connection created")
				}
			case event.ConnectionPoolClosed:
				logger.Warn("🔴 MongoDB connection pool closed")
			}
		},
	}
}

// Database returns the configured database handle. Callers resolve collections
// fresh from here on every use so a reconnect never leaves a dead handle behind.
func (m *ConnectionManager) Database() *mongo.Database {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.client == nil {
		return nil
	}
	return m.client.Database(m.dbName)
}

func (m *ConnectionManager) IsConnected(ctx context.Context) bool {
	m.mu.Lock()
	client := m.client
	m.mu.Unlock()
	if client == nil {
		return false
	}
	return client.Ping(ctx, nil) == nil
}

func (m *ConnectionManager) Close(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.client == nil {
		return nil
	}
	logger.Info("🔌 Closing MongoDB connection...")
	err := m.client.Disconnect(ctx)
	m.client = nil
	logger.Info("✅ MongoDB connection closed")
	return err
}
