// Package rabbitmq owns the message-broker connection, queue declaration and
// the publish path. Only publishing is used by the DNS server; consumers live
// in the services that read these queues.
package rabbitmq

import (
	"fmt"
	"os"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"nexoraldns/webgo/shared/logger"
)

const (
	maxReconnectAttempts = 10
	reconnectDelay       = 5 * time.Second
)

// ConnectionManager keeps one connection and one channel alive, reconnecting in
// the background so no caller on the DNS path ever blocks on broker recovery.
type ConnectionManager struct {
	mu           sync.Mutex
	connection   *amqp.Connection
	channel      *amqp.Channel
	reconnecting bool
	attempts     int
	closed       bool
}

func NewConnectionManager() *ConnectionManager { return &ConnectionManager{} }

func brokerURL() string {
	if v := os.Getenv("RABBITMQ_URI"); v != "" {
		return v
	}
	return "amqp://localhost:5672"
}

// Connect returns the live channel, dialing on first use.
func (r *ConnectionManager) Connect() (*amqp.Channel, error) {
	r.mu.Lock()
	if r.channel != nil && r.connection != nil && !r.connection.IsClosed() {
		ch := r.channel
		r.mu.Unlock()
		return ch, nil
	}
	r.mu.Unlock()

	return r.dial()
}

func (r *ConnectionManager) dial() (*amqp.Channel, error) {
	url := brokerURL()
	logger.Info("📡 Connecting to RabbitMQ...")
	logger.Info("   URL: " + url)

	connection, err := amqp.Dial(url)
	if err != nil {
		logger.Error("❌ Failed to connect to RabbitMQ:", err)
		// Never block the caller on recovery — detach it to the background.
		r.scheduleReconnect()
		return nil, err
	}
	logger.Info("✅ Connected to RabbitMQ successfully!")

	channel, err := connection.Channel()
	if err != nil {
		logger.Error("❌ Failed to connect to RabbitMQ:", err)
		_ = connection.Close()
		r.scheduleReconnect()
		return nil, err
	}
	logger.Info("✅ RabbitMQ channel created!")

	r.mu.Lock()
	r.connection = connection
	r.channel = channel
	r.attempts = 0
	r.mu.Unlock()

	go r.watch(connection)
	return channel, nil
}

// watch turns the broker's close notification into a background reconnect.
func (r *ConnectionManager) watch(connection *amqp.Connection) {
	reason := <-connection.NotifyClose(make(chan *amqp.Error, 1))
	if reason != nil {
		logger.Error("❌ RabbitMQ connection error:", reason)
	}
	logger.Warn("🔴 RabbitMQ connection closed")

	r.mu.Lock()
	if r.connection == connection {
		r.connection = nil
		r.channel = nil
	}
	closed := r.closed
	r.mu.Unlock()

	if !closed {
		r.scheduleReconnect()
	}
}

// scheduleReconnect starts a single background reconnect loop (idempotent).
func (r *ConnectionManager) scheduleReconnect() {
	r.mu.Lock()
	if r.reconnecting || r.closed {
		r.mu.Unlock()
		return
	}
	r.reconnecting = true
	r.mu.Unlock()

	go r.reconnectLoop()
}

func (r *ConnectionManager) reconnectLoop() {
	for {
		r.mu.Lock()
		if r.closed || r.attempts >= maxReconnectAttempts {
			exhausted := !r.closed
			r.reconnecting = false
			r.mu.Unlock()
			if exhausted {
				logger.Error("❌ Max reconnection attempts (10) reached")
			}
			return
		}
		r.attempts++
		attempt := r.attempts
		r.mu.Unlock()

		logger.Warn(fmt.Sprintf("⏳ Reconnecting to RabbitMQ in 5s (attempt %d)", attempt))
		time.Sleep(reconnectDelay)

		if _, err := r.dial(); err == nil {
			r.mu.Lock()
			r.reconnecting = false
			r.mu.Unlock()
			return
		}
	}
}

func (r *ConnectionManager) Channel() *amqp.Channel {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.channel
}

func (r *ConnectionManager) Close() error {
	r.mu.Lock()
	r.closed = true
	channel, connection := r.channel, r.connection
	r.channel, r.connection = nil, nil
	r.mu.Unlock()

	logger.Info("🔌 Closing RabbitMQ connection...")
	if channel != nil {
		if err := channel.Close(); err != nil {
			logger.Error("❌ Error closing RabbitMQ connection:", err)
		}
	}
	if connection != nil {
		if err := connection.Close(); err != nil {
			logger.Error("❌ Error closing RabbitMQ connection:", err)
		}
	}
	logger.Info("✅ RabbitMQ connection closed")
	return nil
}
