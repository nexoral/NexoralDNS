package rabbitmq

import (
	"context"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Service is the façade the application depends on, so call sites never reach
// into the connection, queue or publisher collaborators directly.
type Service struct {
	conn      *ConnectionManager
	queues    *QueueManager
	publisher *Publisher
}

func NewService(conn *ConnectionManager, queues *QueueManager, publisher *Publisher) *Service {
	return &Service{conn: conn, queues: queues, publisher: publisher}
}

func (s *Service) Connect() (*amqp.Channel, error) { return s.conn.Connect() }

func (s *Service) Publish(ctx context.Context, queue string, message any, opts *PublishOptions) bool {
	return s.publisher.Publish(ctx, queue, message, opts)
}

func (s *Service) PublishBatch(ctx context.Context, queue string, messages []any) int {
	return s.publisher.PublishBatch(ctx, queue, messages)
}

func (s *Service) QueueMessageCount(queue string) int { return s.queues.MessageCount(queue) }

func (s *Service) Close() error { return s.conn.Close() }
