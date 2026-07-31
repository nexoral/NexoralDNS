package redis

import (
	"context"
	"fmt"
	"sync"

	goredis "github.com/redis/go-redis/v9"

	"nexoraldns/web/shared/logger"
)

// PubSub owns the subscriber side of Redis. go-redis dedicates a connection to
// each subscription, which is what Redis requires — a connection in subscribe
// mode cannot serve ordinary commands.
type PubSub struct {
	conn *ConnectionManager

	mu   sync.Mutex
	subs []*goredis.PubSub
}

func NewPubSub(conn *ConnectionManager) *PubSub { return &PubSub{conn: conn} }

// Subscribe registers callback for every message on channel and returns once the
// subscription is confirmed. Delivery runs on its own goroutine until Close.
func (p *PubSub) Subscribe(ctx context.Context, channel string, callback func(string)) error {
	client, err := p.conn.Client(ctx)
	if err != nil {
		logger.Error(fmt.Sprintf("❌ Failed to subscribe to channel %s:", channel), err)
		return err
	}

	sub := client.Subscribe(ctx, channel)
	if _, err := sub.Receive(ctx); err != nil {
		logger.Error(fmt.Sprintf("❌ Failed to subscribe to channel %s:", channel), err)
		_ = sub.Close()
		return err
	}

	p.mu.Lock()
	p.subs = append(p.subs, sub)
	p.mu.Unlock()

	logger.Info("📡 Connected to Redis Subscriber Client")
	logger.Info(fmt.Sprintf("👂 Subscribed to channel: %s", channel))

	go func() {
		for msg := range sub.Channel() {
			callback(msg.Payload)
		}
		logger.Warn("🔴 Subscriber connection closed")
	}()

	return nil
}

func (p *PubSub) Publish(ctx context.Context, channel, message string) int64 {
	client, err := p.conn.Client(ctx)
	if err != nil {
		logger.Error(fmt.Sprintf("❌ Failed to publish to channel %s:", channel), err)
		return 0
	}
	n, err := client.Publish(ctx, channel, message).Result()
	if err != nil {
		logger.Error(fmt.Sprintf("❌ Failed to publish to channel %s:", channel), err)
		return 0
	}
	return n
}

func (p *PubSub) Close() error {
	p.mu.Lock()
	subs := p.subs
	p.subs = nil
	p.mu.Unlock()

	for _, sub := range subs {
		_ = sub.Close()
	}
	return nil
}
