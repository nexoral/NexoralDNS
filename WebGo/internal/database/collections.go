// Package database resolves MongoDB collection handles for the service.
package database

import (
	"context"
	"sync"

	"go.mongodb.org/mongo-driver/v2/mongo"

	"nexoraldns/webgo/internal/config"
	"nexoraldns/webgo/shared/logger"
	sharedmongo "nexoraldns/webgo/shared/mongo"
)

// CollectionManager hands out collection handles. Handles are resolved fresh on
// every call rather than cached, so a client reconnect never leaves a caller
// holding a dead one.
type CollectionManager struct {
	conn *sharedmongo.ConnectionManager

	mu          sync.Mutex
	initialized bool
}

func NewCollectionManager(conn *sharedmongo.ConnectionManager) *CollectionManager {
	return &CollectionManager{conn: conn}
}

// Initialize connects and touches every collection once so any lazy setup runs
// at startup rather than on the first query.
func (c *CollectionManager) Initialize(ctx context.Context) error {
	c.mu.Lock()
	if c.initialized {
		c.mu.Unlock()
		return nil
	}
	c.mu.Unlock()

	client, err := c.conn.Connect(ctx)
	if err != nil {
		logger.Error("❌ Failed to initialize collections:", err)
		return err
	}

	db := client.Database(config.DBName())
	for _, name := range config.AllCollections {
		_ = db.Collection(name)
	}

	c.mu.Lock()
	c.initialized = true
	c.mu.Unlock()

	logger.Info("✅ All collections initialized")
	return nil
}

// ErrNoDocuments reports that a query matched nothing.
var ErrNoDocuments = mongo.ErrNoDocuments

// DocFinder is the slice of a collection the query path actually uses.
//
// *mongo.Collection is a concrete struct with no interface of its own, so this
// narrow seam is what lets the resolution logic be exercised without a live
// database. Collection returns the real implementation; tests supply their own.
type DocFinder interface {
	// FindOne decodes the first match into dest, returning ErrNoDocuments when
	// nothing matched.
	FindOne(ctx context.Context, filter any, dest any) error
}

// CollectionSource resolves collections by name. *CollectionManager is the real
// implementation; tests inject their own.
type CollectionSource interface {
	Collection(name string) DocFinder
}

// mongoFinder adapts *mongo.Collection to DocFinder.
type mongoFinder struct{ collection *mongo.Collection }

func (m mongoFinder) FindOne(ctx context.Context, filter, dest any) error {
	return m.collection.FindOne(ctx, filter).Decode(dest)
}

// Collection returns a handle, or nil when the client is not connected.
func (c *CollectionManager) Collection(name string) DocFinder {
	db := c.conn.Database()
	if db == nil {
		logger.Warn("⚠️ Collection not available: " + name)
		return nil
	}
	return mongoFinder{collection: db.Collection(name)}
}
