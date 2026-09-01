package rules

import (
	"testing"
	"time"
)

// ServiceStatusChecker depends on *cache.Service and database.CollectionSource,
// so the tests below cover the pure-logic memo layer and the decide helper.

// ── memoized / memoize / ClearMemo ──────────────────────────────────────────

func TestMemoized_ReturnsNilWhenEmpty(t *testing.T) {
	s := &ServiceStatusChecker{}
	if got := s.memoized(); got != nil {
		t.Errorf("memoized() = %v, want nil", got)
	}
}

func TestMemoized_ReturnsNilWhenExpired(t *testing.T) {
	s := &ServiceStatusChecker{
		memo:   map[string]any{"Service_Status": "active"},
		memoAt: time.Now().Add(-statusMemoTTL - time.Second),
	}
	if got := s.memoized(); got != nil {
		t.Errorf("memoized() = %v, want nil (expired)", got)
	}
}

func TestMemoized_ReturnsValueWhenFresh(t *testing.T) {
	config := map[string]any{"Service_Status": "active"}
	s := &ServiceStatusChecker{
		memo:   config,
		memoAt: time.Now(),
	}
	got := s.memoized()
	if got == nil {
		t.Fatal("memoized() returned nil")
	}
	if got["Service_Status"] != "active" {
		t.Errorf("Service_Status = %v, want active", got["Service_Status"])
	}
}

func TestMemoize_StoresValue(t *testing.T) {
	s := &ServiceStatusChecker{}
	config := map[string]any{"Service_Status": "active", "DefaultTTL": float64(300)}
	s.memoize(config)

	got := s.memoized()
	if got == nil {
		t.Fatal("memoized() returned nil after memoize")
	}
	if got["Service_Status"] != "active" {
		t.Errorf("Service_Status = %v, want active", got["Service_Status"])
	}
}

func TestMemoize_OverwritesPrevious(t *testing.T) {
	s := &ServiceStatusChecker{}
	s.memoize(map[string]any{"Service_Status": "active"})
	s.memoize(map[string]any{"Service_Status": "inactive"})

	got := s.memoized()
	if got["Service_Status"] != "inactive" {
		t.Errorf("Service_Status = %v, want inactive", got["Service_Status"])
	}
}

func TestClearMemo_DropsValue(t *testing.T) {
	s := &ServiceStatusChecker{
		memo:   map[string]any{"Service_Status": "active"},
		memoAt: time.Now(),
	}
	s.ClearMemo()
	if got := s.memoized(); got != nil {
		t.Errorf("memoized() = %v, want nil after ClearMemo", got)
	}
}

func TestClearMemo_WhenAlreadyEmpty(t *testing.T) {
	s := &ServiceStatusChecker{}
	s.ClearMemo() // should not panic
}

// ── statusMemoTTL constant ──────────────────────────────────────────────────

func TestStatusMemoTTL_Value(t *testing.T) {
	if statusMemoTTL != 5*time.Second {
		t.Errorf("statusMemoTTL = %v, want 5s", statusMemoTTL)
	}
}

// ── DefaultTTL (already tested in rules_test.go, adding edge cases) ─────────

func TestDefaultTTL_VeryLargeValue(t *testing.T) {
	config := map[string]any{"DefaultTTL": float64(86400)}
	if got := DefaultTTL(config); got != 86400 {
		t.Errorf("DefaultTTL(86400) = %d, want 86400", got)
	}
}

func TestDefaultTTL_NegativeValue(t *testing.T) {
	config := map[string]any{"DefaultTTL": float64(-100)}
	if got := DefaultTTL(config); got != minTTL {
		t.Errorf("DefaultTTL(-100) = %d, want %d", got, minTTL)
	}
}

// ── TTL constants ───────────────────────────────────────────────────────────

func TestTTLConstants(t *testing.T) {
	if fallbackTTL != 300 {
		t.Errorf("fallbackTTL = %d, want 300", fallbackTTL)
	}
	if minTTL != 10 {
		t.Errorf("minTTL = %d, want 10", minTTL)
	}
}

// ── ErrServiceConfigMissing ─────────────────────────────────────────────────

func TestErrServiceConfigMissing_ErrorString(t *testing.T) {
	err := ErrServiceConfigMissing
	if err.Error() == "" {
		t.Error("ErrServiceConfigMissing has empty error string")
	}
}

// ── ServiceStatusResult ─────────────────────────────────────────────────────

func TestServiceStatusResult_Fields(t *testing.T) {
	r := ServiceStatusResult{Active: true, Config: map[string]any{"key": "val"}}
	if !r.Active {
		t.Error("Active should be true")
	}
	if r.Config["key"] != "val" {
		t.Error("Config mismatch")
	}
}
