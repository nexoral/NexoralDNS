package forwarder

import (
	"context"
	"encoding/binary"
	"fmt"
	"math/rand/v2"
	"os"
	"slices"
	"sync/atomic"
	"time"

	"nexoraldns/webgo/internal/dnsio"
	"nexoraldns/webgo/internal/dnsmsg"
	"nexoraldns/webgo/shared/keys"
	"nexoraldns/webgo/shared/logger"
	"nexoraldns/webgo/shared/rabbitmq"
)

// upstream is one public DNS server available for forwarding.
type upstream struct {
	IP       string
	Name     string
	Location string
}

// Worst case per query is len(upstreams) × upstreamTimeout, so keep this short.
var upstreams = []upstream{
	{"1.1.1.1", "Cloudflare DNS", "Global (Anycast)"},
	{"1.0.0.1", "Cloudflare DNS", "Global (Anycast)"},
	{"8.8.8.8", "Google DNS", "Global (Anycast)"},
	{"8.8.4.4", "Google DNS", "Global (Anycast)"},
	{"9.9.9.10", "Quad9 DNS (Unfiltered)", "Global (Anycast)"},
	{"149.112.112.10", "Quad9 DNS (Unfiltered)", "Global (Anycast)"},
}

const (
	// socketPoolSize sockets share the upstream load. Each multiplexes the full
	// transaction ID space, so this spreads kernel buffer pressure rather than
	// capping concurrency.
	socketPoolSize = 64

	// upstreamTimeout is how long one upstream gets before the next is tried.
	upstreamTimeout = 2 * time.Second
)

// RecordCache stores resolved answers. *cache.Service is the real implementation.
type RecordCache interface {
	Set(ctx context.Context, key string, value any, ttl uint32)
}

// AnalyticsPublisher reports query telemetry. *rabbitmq.Service is the real
// implementation.
type AnalyticsPublisher interface {
	Publish(ctx context.Context, queue string, message any, opts *rabbitmq.PublishOptions) bool
}

// Service forwards queries to upstream DNS servers over a pre-allocated socket
// pool, skipping servers whose circuit breaker is open.
type Service struct {
	pool     *socketPool
	breakers map[string]*circuitBreaker
	cache    RecordCache
	rabbit   AnalyticsPublisher

	attempted atomic.Uint64
	succeeded atomic.Uint64

	debug bool
}

func NewService(cacheService RecordCache, rabbit AnalyticsPublisher) (*Service, error) {
	pool, err := newSocketPool(socketPoolSize)
	if err != nil {
		return nil, err
	}

	breakers := make(map[string]*circuitBreaker, len(upstreams))
	for _, server := range upstreams {
		breakers[server.IP] = newCircuitBreaker(server.IP, server.Name)
	}

	return &Service{
		pool:     pool,
		breakers: breakers,
		cache:    cacheService,
		rabbit:   rabbit,
		debug:    os.Getenv("DEBUG_DNS") != "",
	}, nil
}

// Forward resolves a query upstream and returns the raw response to relay back
// to the client, or nil if no upstream answered.
//
// customTTL, when set, rewrites the TTL on every record in the response and is
// used as the cache lifetime for the parsed answer.
func (s *Service) Forward(
	ctx context.Context,
	msg []byte,
	queryName, queryType string,
	customTTL *uint32,
	rinfo dnsio.RemoteInfo,
	start time.Time,
	isFailSafe bool,
) []byte {
	s.attempted.Add(1)

	reservation, err := s.pool.reserve()
	if err != nil {
		logger.Error(fmt.Sprintf("Forward socket pool saturated for %s", queryName))
		return nil
	}
	defer reservation.release()

	if len(msg) < 2 {
		return nil
	}
	originalTxid := binary.BigEndian.Uint16(msg)

	// Copy so the client's buffer is untouched, then stamp our generated ID.
	outMsg := slices.Clone(msg)
	binary.BigEndian.PutUint16(outMsg, reservation.txid)

	// Shuffle so load spreads across upstreams instead of always hitting the first.
	candidates := slices.Clone(upstreams)
	rand.Shuffle(len(candidates), func(i, j int) {
		candidates[i], candidates[j] = candidates[j], candidates[i]
	})

	for _, server := range candidates {
		breaker := s.breakers[server.IP]
		if !breaker.allowRequest() {
			continue // open circuit: fail fast instead of waiting for a timeout
		}

		response := s.query(ctx, reservation, outMsg, server, queryName)
		if response == nil {
			breaker.recordFailure()
			continue
		}
		breaker.recordSuccess()

		// Restore the client's transaction ID so the reply matches their query.
		binary.BigEndian.PutUint16(response, originalTxid)

		s.publishAnalytics(queryName, queryType, rinfo, server, start, isFailSafe)
		s.cacheAnswer(response, queryName, queryType, customTTL)

		s.succeeded.Add(1)
		if customTTL != nil {
			return dnsmsg.ModifyResponseTTL(response, *customTTL)
		}
		return response
	}

	logger.Error(fmt.Sprintf("No response from any DNS server for %s", queryName))
	return nil
}

// query sends to one upstream and waits for its reply, returning nil on timeout
// or send failure.
func (s *Service) query(
	ctx context.Context,
	reservation reservation,
	outMsg []byte,
	server upstream,
	queryName string,
) []byte {
	reply := reservation.awaitFrom(server.IP)
	defer reservation.stopAwaiting()

	if err := reservation.send(outMsg, server.IP); err != nil {
		return nil
	}
	if s.debug {
		logger.Info(fmt.Sprintf("Forwarding %s to %s (%s)", queryName, server.Name, server.IP))
	}

	timeout := time.NewTimer(upstreamTimeout)
	defer timeout.Stop()

	select {
	case response := <-reply:
		return response
	case <-timeout.C:
		return nil
	case <-ctx.Done():
		return nil
	}
}

// publishAnalytics records the forward. Fire-and-forget: analytics must never
// delay or block a DNS answer, even when the broker is down.
func (s *Service) publishAnalytics(
	queryName, queryType string,
	rinfo dnsio.RemoteInfo,
	server upstream,
	start time.Time,
	isFailSafe bool,
) {
	status, from := keys.StatusForwarded, server.Name
	if isFailSafe {
		status, from = keys.StatusFailSafe, keys.StatusFromFailSafe
	}

	payload := map[string]any{
		"queryName": queryName,
		"queryType": queryType,
		"timestamp": time.Now().UnixMilli(),
		"SourceIP":  rinfo.Address,
		"Status":    status,
		"From":      from,
		"duration":  float64(time.Since(start).Microseconds()) / 1000,
	}

	go func() {
		s.rabbit.Publish(context.Background(), keys.QueueDNSAnalytics, payload, &rabbitmq.PublishOptions{
			Persistent: rabbitmq.Persistent(false),
			Priority:   rabbitmq.Priority(5),
		})
	}()
}

// cacheAnswer stores the parsed answer. Fire-and-forget for the same reason.
func (s *Service) cacheAnswer(response []byte, queryName, queryType string, customTTL *uint32) {
	record := dnsmsg.ParseDNSResponse(response, queryType)
	if record == nil {
		return
	}

	ttl := record.TTL
	if customTTL != nil {
		ttl = *customTTL
	}

	go s.cache.Set(context.Background(), keys.DomainDNSRecord+":"+queryName, record, ttl)
}

// Status reports forwarder health for diagnostics.
type Status struct {
	ActiveForwards   int             `json:"activeForwards"`
	QueueDepth       int             `json:"queueDepth"`
	ConcurrencyLimit int             `json:"concurrencyLimit"`
	TotalAttempted   uint64          `json:"totalAttempted"`
	TotalSucceeded   uint64          `json:"totalSucceeded"`
	SuccessRate      float64         `json:"successRate"`
	Breakers         []BreakerStatus `json:"breakers"`
}

type BreakerStatus struct {
	IP       string `json:"ip"`
	Name     string `json:"name"`
	State    string `json:"state"`
	Failures int    `json:"failures"`
}

// QueueDepth is always zero: the multiplexed model has no blocking queue.
func (s *Service) QueueDepth() int        { return 0 }
func (s *Service) ActiveForwards() int    { return s.pool.totalPending() }
func (s *Service) TotalAttempted() uint64 { return s.attempted.Load() }
func (s *Service) TotalSucceeded() uint64 { return s.succeeded.Load() }

// ConcurrencyLimit is the natural ceiling: the full ID space per socket.
func (s *Service) ConcurrencyLimit() int { return socketPoolSize * txidSpace }

func (s *Service) Status() Status {
	attempted, succeeded := s.attempted.Load(), s.succeeded.Load()

	breakers := make([]BreakerStatus, 0, len(upstreams))
	for _, server := range upstreams {
		state, failures := s.breakers[server.IP].snapshot()
		breakers = append(breakers, BreakerStatus{
			IP: server.IP, Name: server.Name, State: state.String(), Failures: failures,
		})
	}

	var rate float64
	if attempted > 0 {
		rate = float64(succeeded) / float64(attempted) * 100
	}

	return Status{
		ActiveForwards:   s.pool.totalPending(),
		QueueDepth:       0,
		ConcurrencyLimit: s.ConcurrencyLimit(),
		TotalAttempted:   attempted,
		TotalSucceeded:   succeeded,
		SuccessRate:      rate,
		Breakers:         breakers,
	}
}

func (s *Service) Close() { s.pool.close() }
