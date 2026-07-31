// Package app wires every service together once at startup.
//
// This replaces the string-keyed DI container the TypeScript used: the same
// singleton lifetimes and the same dependency graph, but resolved by the
// compiler, so a mis-wired dependency is a build error rather than a runtime
// panic on the first query that needs it.
package app

import (
	"context"
	"sync"

	"nexoraldns/web/internal/cache"
	"nexoraldns/web/internal/database"
	"nexoraldns/web/internal/dbpool"
	"nexoraldns/web/internal/forwarder"
	"nexoraldns/web/internal/rules"
	"nexoraldns/web/internal/server"
	"nexoraldns/web/shared/logger"
	sharedmongo "nexoraldns/web/shared/mongo"
	"nexoraldns/web/shared/rabbitmq"
	sharedredis "nexoraldns/web/shared/redis"
)

// App holds every singleton for the process lifetime.
type App struct {
	Mongo       *sharedmongo.ConnectionManager
	Collections *database.CollectionManager

	Rabbit *rabbitmq.Service

	Redis *sharedredis.ConnectionManager
	Cache *cache.Service

	Forwarder *forwarder.Service
	DBPool    *dbpool.Service
	BlockList *rules.BlockList
	Rules     *rules.StartRules

	UDP *server.UDP
	TCP *server.TCP
	DoT *server.DoT
}

// New builds the object graph in dependency order.
func New() (*App, error) {
	mongoConn := sharedmongo.NewConnectionManager()
	collections := database.NewCollectionManager(mongoConn)

	rabbitConn := rabbitmq.NewConnectionManager()
	rabbitQueues := rabbitmq.NewQueueManager(rabbitConn)
	rabbitService := rabbitmq.NewService(rabbitConn, rabbitQueues, rabbitmq.NewPublisher(rabbitConn, rabbitQueues))

	redisConn := sharedredis.NewConnectionManager()
	cacheService := cache.NewService(
		redisConn,
		sharedredis.NewCacheStore(redisConn),
		sharedredis.NewPubSub(redisConn),
		cache.NewACLService(redisConn),
	)

	forwarderService, err := forwarder.NewService(cacheService, rabbitService)
	if err != nil {
		return nil, err
	}

	blockList := rules.NewBlockList(cacheService)
	dbPool := dbpool.NewService(collections)
	rulesService := rules.NewStartRules(
		blockList,
		rules.NewServiceStatusChecker(cacheService, collections),
		dbPool,
		cacheService,
		rabbitService,
		forwarderService,
	)

	return &App{
		Mongo:       mongoConn,
		Collections: collections,
		Rabbit:      rabbitService,
		Redis:       redisConn,
		Cache:       cacheService,
		Forwarder:   forwarderService,
		DBPool:      dbPool,
		BlockList:   blockList,
		Rules:       rulesService,
		UDP:         server.NewUDP(rulesService),
		TCP:         server.NewTCP(rulesService),
		DoT:         server.NewDoT(rulesService),
	}, nil
}

// Start connects the infrastructure and binds all three DNS transports.
//
// MongoDB is connected in the background: the fail-safe path in the rules
// pipeline already forwards queries upstream while the database is unreachable,
// so DNS must start answering immediately rather than waiting on it.
func (a *App) Start(ctx context.Context) error {
	go func() {
		if err := a.Collections.Initialize(ctx); err != nil {
			logger.Error("Failed to connect to MongoDB:", err)
		}
	}()

	// Establish the broker connection up front. Publishing never dials, so
	// without this first connect analytics would be dropped until the
	// background reconnect loop succeeded.
	go func() {
		if _, err := a.Rabbit.Connect(); err != nil {
			logger.Error("Failed to connect to RabbitMQ:", err)
		}
	}()

	go a.Rules.SubscribeInvalidations(ctx)

	if err := a.UDP.Start(ctx); err != nil {
		return err
	}
	if err := a.TCP.Start(ctx); err != nil {
		return err
	}
	return a.DoT.Start(ctx)
}

// Shutdown stops the listeners, then closes each infrastructure connection so
// buffered messages are flushed and in-flight work drains. Closes are
// independent because any given connection may never have been opened.
func (a *App) Shutdown(ctx context.Context) {
	a.UDP.Close()
	a.TCP.Close()
	a.DoT.Close()
	a.Forwarder.Close()

	var wg sync.WaitGroup
	for _, closeConn := range []func() error{
		a.Rabbit.Close,
		a.Cache.Close,
		func() error { return a.Mongo.Close(ctx) },
	} {
		wg.Go(func() { _ = closeConn() })
	}
	wg.Wait()
}
