package rabbitmq

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	amqp "github.com/rabbitmq/amqp091-go"

	"nexoraldns/webgo/shared/logger"
)

// PublishOptions mirrors the option bag the TypeScript publisher accepted.
// Zero values mean "use the defaults": persistent true, priority 5, no expiry.
type PublishOptions struct {
	Persistent *bool
	Priority   *uint8
	Expiration string
}

// Publisher serialises messages to JSON and writes them to a queue.
//
// An amqp091 Channel is not safe for concurrent publishes, and every DNS query
// goroutine may publish analytics at once, so writes are serialised here. This
// is off the DNS response path (all publishes are fire-and-forget), so the lock
// never delays an answer.
type Publisher struct {
	conn   *ConnectionManager
	queues *QueueManager

	mu sync.Mutex
}

func NewPublisher(conn *ConnectionManager, queues *QueueManager) *Publisher {
	return &Publisher{conn: conn, queues: queues}
}

func Persistent(v bool) *bool { return &v }
func Priority(v uint8) *uint8 { return &v }

func (p *Publisher) Publish(ctx context.Context, queue string, message any, opts *PublishOptions) bool {
	body, err := json.Marshal(message)
	if err != nil {
		logger.Error(fmt.Sprintf("❌ Failed to publish to queue %s:", queue), err)
		return false
	}

	persistent, priority, expiration := amqp.Persistent, uint8(5), ""
	if opts != nil {
		if opts.Persistent != nil && !*opts.Persistent {
			persistent = amqp.Transient
		}
		if opts.Priority != nil {
			priority = *opts.Priority
		}
		expiration = opts.Expiration
	}

	// Take the live channel without dialling. Establishing a connection can take
	// seconds, and every DNS query may publish here — blocking on a dial would
	// pile up goroutines for as long as the broker is down. The connection
	// manager reconnects in the background, so dropping a message is the right
	// trade for a best-effort analytics feed.
	channel := p.conn.Channel()
	if channel == nil {
		return false
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	if err := p.queues.EnsureQueue(channel, queue); err != nil {
		logger.Error(fmt.Sprintf("❌ Failed to publish to queue %s:", queue), err)
		return false
	}

	err = channel.PublishWithContext(ctx, "", queue, false, false, amqp.Publishing{
		ContentType:  "application/json",
		Body:         body,
		DeliveryMode: persistent,
		Priority:     priority,
		Expiration:   expiration,
	})
	if err != nil {
		// The channel is unusable after a publish error; drop the declared-queue
		// markers so the next attempt re-declares on a fresh channel.
		p.queues.forget()
		logger.Error(fmt.Sprintf("❌ Failed to publish to queue %s:", queue), err)
		return false
	}
	// Parity with the TypeScript publisher, which logged every publish at info.
	// This fires once per DNS query via the analytics queue — drop it if the log
	// volume matters more than matching the old output.
	logger.Info(fmt.Sprintf("📤 Published message to queue: %s", queue))
	return true
}

func (p *Publisher) PublishBatch(ctx context.Context, queue string, messages []any) int {
	sent := 0
	for _, message := range messages {
		if p.Publish(ctx, queue, message, nil) {
			sent++
		}
	}
	logger.Info(fmt.Sprintf("📤 Published %d/%d messages to queue: %s", sent, len(messages), queue))
	return sent
}
