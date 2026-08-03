package rules

import (
	"context"
	"time"

	"nexoraldns/web/shared/keys"
	"nexoraldns/web/shared/rabbitmq"
)

// analytics is one query's telemetry record.
type analytics struct {
	QueryName string  `json:"queryName"`
	QueryType string  `json:"queryType"`
	Timestamp int64   `json:"timestamp"`
	SourceIP  string  `json:"SourceIP"`
	Status    string  `json:"Status"`
	From      string  `json:"From"`
	Duration  float64 `json:"duration"`
}

// AnalyticsPublisher reports query telemetry. *rabbitmq.Service is the real
// implementation.
type AnalyticsPublisher interface {
	Publish(ctx context.Context, queue string, message any, opts *rabbitmq.PublishOptions) bool
}

// publishAnalytics is fire-and-forget. Analytics is best-effort and must never
// block or delay a DNS answer, even when the broker is down.
func (s *StartRules) publishAnalytics(event analytics) {
	go func() {
		s.rabbit.Publish(context.Background(), keys.QueueDNSAnalytics, event, &rabbitmq.PublishOptions{
			Persistent: rabbitmq.Persistent(false),
			Priority:   rabbitmq.Priority(5),
		})
	}()
}

// millisSince reports elapsed time in fractional milliseconds, matching the
// resolution the analytics consumer expects.
func millisSince(start time.Time) float64 {
	return float64(time.Since(start).Microseconds()) / 1000
}
