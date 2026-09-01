package dbpool

import (
	"context"
	"errors"
	"testing"

	"go.mongodb.org/mongo-driver/v2/bson"

	"nexoraldns/web/internal/database"
	"nexoraldns/web/internal/dnsmsg"
)

// ── mock DocFinder ──────────────────────────────────────────────────────────

type mockDocFinder struct {
	records map[string]dnsmsg.Record
}

func (m *mockDocFinder) FindOne(_ context.Context, filter any, dest any) error {
	filterMap, ok := filter.(bson.M)
	if !ok {
		return database.ErrNoDocuments
	}
	name, _ := filterMap["name"].(string)
	record, found := m.records[name]
	if !found {
		return database.ErrNoDocuments
	}
	*(dest.(*dnsmsg.Record)) = record
	return nil
}

type mockCollectionSource struct {
	finder database.DocFinder
}

func (m *mockCollectionSource) Collection(_ string) database.DocFinder {
	return m.finder
}

// ── Resolve ─────────────────────────────────────────────────────────────────

func TestResolve_SimpleARecord(t *testing.T) {
	finder := &mockDocFinder{
		records: map[string]dnsmsg.Record{
			"example.com": {Type: "A", Name: "example.com", Value: "1.2.3.4", TTL: 300},
		},
	}
	svc := NewService(&mockCollectionSource{finder: finder})

	record, err := svc.Resolve(context.Background(), "example.com")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if record == nil {
		t.Fatal("returned nil")
	}
	if record.Name != "example.com" {
		t.Errorf("Name = %q, want example.com", record.Name)
	}
	if record.Value != "1.2.3.4" {
		t.Errorf("Value = %q, want 1.2.3.4", record.Value)
	}
}

func TestResolve_CNAMERedirection(t *testing.T) {
	finder := &mockDocFinder{
		records: map[string]dnsmsg.Record{
			"www.example.com":   {Type: "CNAME", Name: "www.example.com", Value: "example.com", TTL: 300},
			"example.com":       {Type: "A", Name: "example.com", Value: "1.2.3.4", TTL: 300},
		},
	}
	svc := NewService(&mockCollectionSource{finder: finder})

	record, err := svc.Resolve(context.Background(), "www.example.com")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if record == nil {
		t.Fatal("returned nil")
	}
	// The resolved record should carry the original query name
	if record.Name != "www.example.com" {
		t.Errorf("Name = %q, want www.example.com", record.Name)
	}
	if record.Value != "1.2.3.4" {
		t.Errorf("Value = %q, want 1.2.3.4", record.Value)
	}
}

func TestResolve_ChainedCNAME(t *testing.T) {
	finder := &mockDocFinder{
		records: map[string]dnsmsg.Record{
			"a.example.com": {Type: "CNAME", Name: "a.example.com", Value: "b.example.com", TTL: 300},
			"b.example.com": {Type: "CNAME", Name: "b.example.com", Value: "c.example.com", TTL: 300},
			"c.example.com": {Type: "A", Name: "c.example.com", Value: "10.0.0.1", TTL: 60},
		},
	}
	svc := NewService(&mockCollectionSource{finder: finder})

	record, err := svc.Resolve(context.Background(), "a.example.com")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if record == nil {
		t.Fatal("returned nil")
	}
	if record.Name != "a.example.com" {
		t.Errorf("Name = %q, want a.example.com", record.Name)
	}
	if record.Value != "10.0.0.1" {
		t.Errorf("Value = %q, want 10.0.0.1", record.Value)
	}
}

func TestResolve_CircularCNAME(t *testing.T) {
	finder := &mockDocFinder{
		records: map[string]dnsmsg.Record{
			"a.example.com": {Type: "CNAME", Name: "a.example.com", Value: "b.example.com", TTL: 300},
			"b.example.com": {Type: "CNAME", Name: "b.example.com", Value: "a.example.com", TTL: 300},
		},
	}
	svc := NewService(&mockCollectionSource{finder: finder})

	_, err := svc.Resolve(context.Background(), "a.example.com")
	if err == nil {
		t.Fatal("expected circular CNAME error")
	}
	if !errors.Is(err, ErrCircularCNAME) {
		t.Errorf("error = %v, want ErrCircularCNAME", err)
	}
}

func TestResolve_NotFound(t *testing.T) {
	finder := &mockDocFinder{records: map[string]dnsmsg.Record{}}
	svc := NewService(&mockCollectionSource{finder: finder})

	record, err := svc.Resolve(context.Background(), "nonexistent.com")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if record != nil {
		t.Errorf("expected nil, got %v", record)
	}
}

func TestResolve_NilCollection(t *testing.T) {
	svc := NewService(&mockCollectionSource{finder: nil})

	_, err := svc.Resolve(context.Background(), "example.com")
	if err == nil {
		t.Fatal("expected error for nil collection")
	}
}

func TestResolve_HopCache(t *testing.T) {
	finder := &mockDocFinder{
		records: map[string]dnsmsg.Record{
			"shared.example.com": {Type: "A", Name: "shared.example.com", Value: "1.2.3.4", TTL: 300},
			"a.example.com":      {Type: "CNAME", Name: "a.example.com", Value: "shared.example.com", TTL: 300},
			"b.example.com":      {Type: "CNAME", Name: "b.example.com", Value: "shared.example.com", TTL: 300},
		},
	}
	svc := NewService(&mockCollectionSource{finder: finder})

	// First resolve populates the hop cache
	r1, err := svc.Resolve(context.Background(), "a.example.com")
	if err != nil || r1 == nil {
		t.Fatalf("first resolve failed: %v", err)
	}

	// Second resolve should use the hop cache for "shared.example.com"
	r2, err := svc.Resolve(context.Background(), "b.example.com")
	if err != nil || r2 == nil {
		t.Fatalf("second resolve failed: %v", err)
	}
	if r2.Value != "1.2.3.4" {
		t.Errorf("Value = %q, want 1.2.3.4", r2.Value)
	}
}
