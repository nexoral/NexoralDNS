package forwarder

import (
	"testing"
	"time"
)

// ── newCircuitBreaker ───────────────────────────────────────────────────────

func TestNewCircuitBreaker_InitialState(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google DNS")
	state, failures := cb.snapshot()
	if state != stateClosed {
		t.Errorf("initial state = %v, want CLOSED", state)
	}
	if failures != 0 {
		t.Errorf("initial failures = %d, want 0", failures)
	}
}

// ── breakerState.String ─────────────────────────────────────────────────────

func TestBreakerState_String(t *testing.T) {
	tests := []struct {
		state breakerState
		want  string
	}{
		{stateClosed, "CLOSED"},
		{stateOpen, "OPEN"},
		{stateHalfOpen, "HALF_OPEN"},
		{breakerState(99), "CLOSED"}, // unknown falls through to default
	}
	for _, tt := range tests {
		if got := tt.state.String(); got != tt.want {
			t.Errorf("breakerState(%d).String() = %q, want %q", tt.state, got, tt.want)
		}
	}
}

// ── allowRequest ────────────────────────────────────────────────────────────

func TestAllowRequest_ClosedState(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google")
	if !cb.allowRequest() {
		t.Error("closed breaker should allow requests")
	}
}

func TestAllowRequest_OpenState_BeforeCooldown(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google")
	// Trip the breaker
	for range failureThreshold {
		cb.recordFailure()
	}
	if cb.allowRequest() {
		t.Error("open breaker should not allow requests before cooldown")
	}
}

func TestAllowRequest_OpenState_AfterCooldown(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google")
	// Trip the breaker
	for range failureThreshold {
		cb.recordFailure()
	}
	// Simulate cooldown elapsed
	cb.mu.Lock()
	cb.lastFailureTime = time.Now().Add(-breakerCooldown - time.Second)
	cb.mu.Unlock()

	if !cb.allowRequest() {
		t.Error("open breaker should allow one probe after cooldown")
	}
	// Should be half-open now
	state, _ := cb.snapshot()
	if state != stateHalfOpen {
		t.Errorf("state = %v, want HALF_OPEN", state)
	}
}

func TestAllowRequest_HalfOpen_AllowsOneProbe(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google")
	// Trip then wait for cooldown
	for range failureThreshold {
		cb.recordFailure()
	}
	cb.mu.Lock()
	cb.lastFailureTime = time.Now().Add(-breakerCooldown - time.Second)
	cb.mu.Unlock()

	// First probe should succeed
	if !cb.allowRequest() {
		t.Error("first probe in half-open should be allowed")
	}
	// Second probe should be blocked
	if cb.allowRequest() {
		t.Error("second probe in half-open should be blocked")
	}
}

// ── recordFailure ───────────────────────────────────────────────────────────

func TestRecordFailure_IncrementsCount(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google")
	cb.recordFailure()
	state, failures := cb.snapshot()
	if state != stateClosed {
		t.Errorf("state = %v, want CLOSED (below threshold)", state)
	}
	if failures != 1 {
		t.Errorf("failures = %d, want 1", failures)
	}
}

func TestRecordFailure_TripsAtThreshold(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google")
	for range failureThreshold {
		cb.recordFailure()
	}
	state, _ := cb.snapshot()
	if state != stateOpen {
		t.Errorf("state = %v, want OPEN (at threshold)", state)
	}
}

func TestRecordFailure_HalfOpen_ReopensImmediately(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google")
	// Trip the breaker
	for range failureThreshold {
		cb.recordFailure()
	}
	// Move to half-open
	cb.mu.Lock()
	cb.lastFailureTime = time.Now().Add(-breakerCooldown - time.Second)
	cb.mu.Unlock()
	cb.allowRequest() // promotes to half-open

	// Fail the probe
	cb.recordFailure()
	state, _ := cb.snapshot()
	if state != stateOpen {
		t.Errorf("state = %v, want OPEN (failed probe reopens)", state)
	}
}

func TestRecordFailure_ResetsWindowAfterExpiry(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google")
	cb.recordFailure()
	// Move the window start far into the past
	cb.mu.Lock()
	cb.failureWindowStart = time.Now().Add(-failureWindow - time.Second)
	cb.mu.Unlock()

	cb.recordFailure()
	_, failures := cb.snapshot()
	if failures != 1 {
		t.Errorf("failures = %d, want 1 (window reset)", failures)
	}
}

// ── recordSuccess ───────────────────────────────────────────────────────────

func TestRecordSuccess_ResetsState(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google")
	// Accumulate some failures (below threshold)
	cb.recordFailure()
	cb.recordFailure()

	cb.recordSuccess()
	state, failures := cb.snapshot()
	if state != stateClosed {
		t.Errorf("state = %v, want CLOSED", state)
	}
	if failures != 0 {
		t.Errorf("failures = %d, want 0", failures)
	}
}

func TestRecordSuccess_FromHalfOpen(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google")
	// Trip the breaker
	for range failureThreshold {
		cb.recordFailure()
	}
	// Move to half-open
	cb.mu.Lock()
	cb.lastFailureTime = time.Now().Add(-breakerCooldown - time.Second)
	cb.mu.Unlock()
	cb.allowRequest()

	cb.recordSuccess()
	state, _ := cb.snapshot()
	if state != stateClosed {
		t.Errorf("state = %v, want CLOSED (probe succeeded)", state)
	}
}

// ── snapshot ────────────────────────────────────────────────────────────────

func TestSnapshot_ConcurrentSafety(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google")
	done := make(chan struct{})
	go func() {
		for range 100 {
			cb.recordFailure()
		}
		close(done)
	}()
	for range 100 {
		cb.snapshot()
	}
	<-done
}

// ── allowRequest half-open with no probe ────────────────────────────────────

func TestAllowRequest_HalfOpen_NoProbeInFlight(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google")
	// Trip the breaker
	for range failureThreshold {
		cb.recordFailure()
	}
	// Move to half-open
	cb.mu.Lock()
	cb.lastFailureTime = time.Now().Add(-breakerCooldown - time.Second)
	cb.mu.Unlock()

	// First call promotes to half-open and sets probeInFlight
	cb.allowRequest()
	// Simulate probe completing (recordFailure resets probeInFlight)
	cb.recordFailure()

	// Now re-open, wait for cooldown again
	cb.mu.Lock()
	cb.lastFailureTime = time.Now().Add(-breakerCooldown - time.Second)
	cb.mu.Unlock()

	// Should allow again (new probe)
	if !cb.allowRequest() {
		t.Error("should allow new probe after previous probe completed")
	}
}

// ── recordFailure resets probeInFlight ──────────────────────────────────────

func TestRecordFailure_ResetsProbeInFlight(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google")
	// Trip and move to half-open
	for range failureThreshold {
		cb.recordFailure()
	}
	cb.mu.Lock()
	cb.lastFailureTime = time.Now().Add(-breakerCooldown - time.Second)
	cb.mu.Unlock()
	cb.allowRequest() // sets probeInFlight = true

	cb.recordFailure() // should reset probeInFlight = false

	cb.mu.Lock()
	probe := cb.probeInFlight
	cb.mu.Unlock()
	if probe {
		t.Error("probeInFlight should be false after recordFailure")
	}
}

// ── recordSuccess resets probeInFlight ──────────────────────────────────────

func TestRecordSuccess_ResetsProbeInFlight(t *testing.T) {
	cb := newCircuitBreaker("8.8.8.8", "Google")
	for range failureThreshold {
		cb.recordFailure()
	}
	cb.mu.Lock()
	cb.lastFailureTime = time.Now().Add(-breakerCooldown - time.Second)
	cb.mu.Unlock()
	cb.allowRequest()

	cb.recordSuccess()

	cb.mu.Lock()
	probe := cb.probeInFlight
	cb.mu.Unlock()
	if probe {
		t.Error("probeInFlight should be false after recordSuccess")
	}
}
