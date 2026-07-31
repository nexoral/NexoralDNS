package rabbitmq

import (
	"fmt"
	"sync"

	amqp "github.com/rabbitmq/amqp091-go"

	"nexoraldns/webgo/shared/logger"
)

// QueueManager declares queues on demand and remembers which it has already
// declared, so the assert cost is paid once per queue per process.
type QueueManager struct {
	conn *ConnectionManager

	mu       sync.Mutex
	asserted map[string]struct{}
}

func NewQueueManager(conn *ConnectionManager) *QueueManager {
	return &QueueManager{conn: conn, asserted: map[string]struct{}{}}
}

// EnsureQueue declares the queue on channel if it has not been declared yet.
// The channel is passed in rather than dialled here, so a caller on a hot path
// never blocks establishing a connection.
func (q *QueueManager) EnsureQueue(channel *amqp.Channel, queue string) error {
	q.mu.Lock()
	_, done := q.asserted[queue]
	q.mu.Unlock()
	if done {
		return nil
	}

	_, err := channel.QueueDeclare(queue, true, false, false, false, amqp.Table{
		"x-max-priority": int32(10),
	})
	if err != nil {
		return err
	}

	q.mu.Lock()
	q.asserted[queue] = struct{}{}
	q.mu.Unlock()
	return nil
}

// forget drops the declared-marker so the next publish re-declares. Called when
// a channel dies, since queue state is tracked per channel.
func (q *QueueManager) forget() {
	q.mu.Lock()
	clear(q.asserted)
	q.mu.Unlock()
}

func (q *QueueManager) MessageCount(queue string) int {
	channel, err := q.conn.Connect()
	if err != nil {
		logger.Error(fmt.Sprintf("❌ Failed to get message count for queue %s:", queue), err)
		return -1
	}
	if err := q.EnsureQueue(channel, queue); err != nil {
		logger.Error(fmt.Sprintf("❌ Failed to get message count for queue %s:", queue), err)
		return -1
	}
	info, err := channel.QueueInspect(queue)
	if err != nil {
		logger.Error(fmt.Sprintf("❌ Failed to get message count for queue %s:", queue), err)
		return -1
	}
	return info.Messages
}
