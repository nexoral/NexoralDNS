package rules

import (
	"testing"
	"time"
)

// ── millisSince ─────────────────────────────────────────────────────────────

func TestMillisSince_ReturnsPositiveDuration(t *testing.T) {
	start := time.Now().Add(-10 * time.Millisecond)
	ms := millisSince(start)
	if ms < 5 || ms > 50 {
		t.Errorf("millisSince = %f, want ~10ms", ms)
	}
}

func TestMillisSince_ZeroDuration(t *testing.T) {
	start := time.Now()
	ms := millisSince(start)
	if ms < 0 || ms > 5 {
		t.Errorf("millisSince(now) = %f, want ~0", ms)
	}
}

func TestMillisSince_SubMillisecondPrecision(t *testing.T) {
	start := time.Now().Add(-500 * time.Microsecond)
	ms := millisSince(start)
	if ms < 0.1 || ms > 3 {
		t.Errorf("millisSince(500µs) = %f, want ~0.5", ms)
	}
}

// ── analytics struct ────────────────────────────────────────────────────────

func TestAnalytics_Fields(t *testing.T) {
	a := analytics{
		QueryName: "example.com",
		QueryType: "A",
		SourceIP:  "192.168.1.1",
		Timestamp: time.Now().UnixMilli(),
		Status:    "RESOLVED",
		From:      "FROM DB",
		Duration:  1.234,
	}
	if a.QueryName != "example.com" {
		t.Errorf("QueryName = %q", a.QueryName)
	}
	if a.QueryType != "A" {
		t.Errorf("QueryType = %q", a.QueryType)
	}
	if a.SourceIP != "192.168.1.1" {
		t.Errorf("SourceIP = %q", a.SourceIP)
	}
	if a.Status != "RESOLVED" {
		t.Errorf("Status = %q", a.Status)
	}
	if a.From != "FROM DB" {
		t.Errorf("From = %q", a.From)
	}
	if a.Duration != 1.234 {
		t.Errorf("Duration = %f", a.Duration)
	}
}
