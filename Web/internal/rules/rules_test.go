package rules

import (
	"testing"

	"nexoraldns/web/internal/dnsmsg"
)

// ── DefaultTTL ──────────────────────────────────────────────────────────────

func TestDefaultTTL_NilConfig(t *testing.T) {
	if got := DefaultTTL(nil); got != fallbackTTL {
		t.Errorf("DefaultTTL(nil) = %d, want %d", got, fallbackTTL)
	}
}

func TestDefaultTTL_Float64(t *testing.T) {
	config := map[string]any{"DefaultTTL": float64(600)}
	if got := DefaultTTL(config); got != 600 {
		t.Errorf("DefaultTTL(float64 600) = %d, want 600", got)
	}
}

func TestDefaultTTL_Int32(t *testing.T) {
	config := map[string]any{"DefaultTTL": int32(120)}
	if got := DefaultTTL(config); got != 120 {
		t.Errorf("DefaultTTL(int32 120) = %d, want 120", got)
	}
}

func TestDefaultTTL_Int64(t *testing.T) {
	config := map[string]any{"DefaultTTL": int64(450)}
	if got := DefaultTTL(config); got != 450 {
		t.Errorf("DefaultTTL(int64 450) = %d, want 450", got)
	}
}

func TestDefaultTTL_Int(t *testing.T) {
	config := map[string]any{"DefaultTTL": int(90)}
	if got := DefaultTTL(config); got != 90 {
		t.Errorf("DefaultTTL(int 90) = %d, want 90", got)
	}
}

func TestDefaultTTL_String_FallsBack(t *testing.T) {
	config := map[string]any{"DefaultTTL": "not-a-number"}
	if got := DefaultTTL(config); got != fallbackTTL {
		t.Errorf("DefaultTTL(string) = %d, want %d", got, fallbackTTL)
	}
}

func TestDefaultTTL_BelowMinimum(t *testing.T) {
	config := map[string]any{"DefaultTTL": float64(1)}
	if got := DefaultTTL(config); got != minTTL {
		t.Errorf("DefaultTTL(1) = %d, want %d (minTTL)", got, minTTL)
	}
}

func TestDefaultTTL_AtMinimum(t *testing.T) {
	config := map[string]any{"DefaultTTL": float64(minTTL)}
	if got := DefaultTTL(config); got != minTTL {
		t.Errorf("DefaultTTL(minTTL) = %d, want %d", got, minTTL)
	}
}

func TestDefaultTTL_MissingKey(t *testing.T) {
	config := map[string]any{"other_key": float64(100)}
	if got := DefaultTTL(config); got != fallbackTTL {
		t.Errorf("DefaultTTL(missing key) = %d, want %d", got, fallbackTTL)
	}
}

func TestDefaultTTL_ZeroValue(t *testing.T) {
	config := map[string]any{"DefaultTTL": float64(0)}
	if got := DefaultTTL(config); got != minTTL {
		t.Errorf("DefaultTTL(0) = %d, want %d (floored to min)", got, minTTL)
	}
}

// ── servableLocally ─────────────────────────────────────────────────────────

func TestServableLocally_MatchingARecord(t *testing.T) {
	record := &dnsmsg.Record{Type: "A", Name: "example.com", Value: "1.2.3.4", TTL: 300}
	if !servableLocally(record, "example.com", "A") {
		t.Error("should be servable: matching A record and A query")
	}
}

func TestServableLocally_NilRecord(t *testing.T) {
	if servableLocally(nil, "example.com", "A") {
		t.Error("nil record should not be servable")
	}
}

func TestServableLocally_NameMismatch(t *testing.T) {
	record := &dnsmsg.Record{Type: "A", Name: "other.com", Value: "1.2.3.4", TTL: 300}
	if servableLocally(record, "example.com", "A") {
		t.Error("name mismatch should not be servable")
	}
}

func TestServableLocally_AAAARecord(t *testing.T) {
	record := &dnsmsg.Record{Type: "AAAA", Name: "example.com", Value: "::1", TTL: 300}
	if servableLocally(record, "example.com", "A") {
		t.Error("AAAA record should not be servable for A query")
	}
}

func TestServableLocally_AAAAQuery(t *testing.T) {
	record := &dnsmsg.Record{Type: "A", Name: "example.com", Value: "1.2.3.4", TTL: 300}
	if servableLocally(record, "example.com", "AAAA") {
		t.Error("A record should not be servable for AAAA query")
	}
}

func TestServableLocally_CNAMERecord(t *testing.T) {
	record := &dnsmsg.Record{Type: "CNAME", Name: "example.com", Value: "other.com", TTL: 300}
	if servableLocally(record, "example.com", "A") {
		t.Error("CNAME record should not be servable")
	}
}

func TestServableLocally_MXRecord(t *testing.T) {
	record := &dnsmsg.Record{Type: "MX", Name: "example.com", Value: "mail.example.com", TTL: 300}
	if servableLocally(record, "example.com", "MX") {
		t.Error("MX record should not be servable (only A records are servable)")
	}
}
