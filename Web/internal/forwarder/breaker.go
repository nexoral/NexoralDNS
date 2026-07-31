// Package forwarder resolves queries this server cannot answer itself by
// forwarding them to public upstream DNS servers.
package forwarder

import (
	"sync"
	"time"
)

// Circuit breaker states.
type breakerState int

const (
	stateClosed breakerState = iota
	stateOpen
	stateHalfOpen
)

func (s breakerState) String() string {
	switch s {
	case stateOpen:
		return "OPEN"
	case stateHalfOpen:
		return "HALF_OPEN"
	default:
		return "CLOSED"
	}
}

// Breaker tuning: five failures inside the window trips the breaker, and it
// stays open for the cooldown before allowing a single probe through.
const (
	failureThreshold = 5
	failureWindow    = 30 * time.Second
	breakerCooldown  = 30 * time.Second
)

// circuitBreaker tracks one upstream's health so a dead server is skipped in
// microseconds instead of costing every query a full timeout.
type circuitBreaker struct {
	ip   string
	name string

	mu                 sync.Mutex
	state              breakerState
	failureCount       int
	failureWindowStart time.Time
	lastFailureTime    time.Time
}

func newCircuitBreaker(ip, name string) *circuitBreaker {
	return &circuitBreaker{ip: ip, name: name}
}

// allowRequest reports whether this upstream should be attempted.
func (c *circuitBreaker) allowRequest() bool {
	c.mu.Lock()
	defer c.mu.Unlock()

	switch c.state {
	case stateClosed:
		return true

	case stateOpen:
		if time.Since(c.lastFailureTime) >= breakerCooldown {
			c.state = stateHalfOpen
			return true // probe
		}
		return false

	default: // stateHalfOpen — allow exactly one probe
		c.state = stateOpen // flips back to closed on success
		return true
	}
}

func (c *circuitBreaker) recordFailure() {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	if c.failureWindowStart.IsZero() || now.Sub(c.failureWindowStart) > failureWindow {
		c.failureWindowStart = now
		c.failureCount = 0
	}
	c.failureCount++
	c.lastFailureTime = now

	if c.failureCount >= failureThreshold {
		c.state = stateOpen
	}
}

func (c *circuitBreaker) recordSuccess() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.failureCount = 0
	c.failureWindowStart = time.Time{}
	c.state = stateClosed
}

func (c *circuitBreaker) snapshot() (breakerState, int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.state, c.failureCount
}
