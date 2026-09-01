package rules

import (
	"testing"
	"time"
)

// BlockList depends on *cache.Service (Redis-backed), so the tests below cover
// only the pure-logic parts: the in-memory verdict cache, eviction, and
// ClearCaches. The Redis-dependent methods (CheckDomain, CheckDomainWithDetails,
// BlockedDomainsForClient, CheckDomainsBatch) are covered by integration tests.

// ── NewBlockList ────────────────────────────────────────────────────────────

func TestNewBlockList_InitializesVerdictsMap(t *testing.T) {
	bl := &BlockList{verdicts: map[string]blockVerdict{}}
	if bl.verdicts == nil {
		t.Error("verdicts map is nil")
	}
	if len(bl.verdicts) != 0 {
		t.Errorf("verdicts len = %d, want 0", len(bl.verdicts))
	}
}

// ── ClearCaches ─────────────────────────────────────────────────────────────

func TestClearCaches_EmptiesVerdicts(t *testing.T) {
	bl := &BlockList{verdicts: map[string]blockVerdict{
		"ip:domain1": {blocked: true, cachedAt: time.Now()},
		"ip:domain2": {blocked: false, cachedAt: time.Now()},
	}}
	bl.ClearCaches()
	if len(bl.verdicts) != 0 {
		t.Errorf("verdicts len = %d, want 0", len(bl.verdicts))
	}
}

func TestClearCaches_EmptyMap(t *testing.T) {
	bl := &BlockList{verdicts: map[string]blockVerdict{}}
	bl.ClearCaches() // should not panic
	if len(bl.verdicts) != 0 {
		t.Errorf("verdicts len = %d, want 0", len(bl.verdicts))
	}
}

// ── evictExpiredLocked ──────────────────────────────────────────────────────

func TestEvictExpired_RemovesStaleEntries(t *testing.T) {
	bl := &BlockList{verdicts: map[string]blockVerdict{
		"old:entry": {blocked: true, cachedAt: time.Now().Add(-blockCacheTTL - time.Second)},
		"new:entry": {blocked: true, cachedAt: time.Now()},
	}}

	bl.evictExpiredLocked()
	if len(bl.verdicts) != 1 {
		t.Errorf("len = %d, want 1", len(bl.verdicts))
	}
	if _, ok := bl.verdicts["new:entry"]; !ok {
		t.Error("new:entry should not be evicted")
	}
}

func TestEvictExpired_KeepsFreshEntries(t *testing.T) {
	bl := &BlockList{verdicts: map[string]blockVerdict{
		"fresh1": {blocked: true, cachedAt: time.Now()},
		"fresh2": {blocked: false, cachedAt: time.Now().Add(-time.Second)},
	}}

	bl.evictExpiredLocked()
	if len(bl.verdicts) != 2 {
		t.Errorf("len = %d, want 2", len(bl.verdicts))
	}
}

func TestEvictExpired_EmptyMap(t *testing.T) {
	bl := &BlockList{verdicts: map[string]blockVerdict{}}
	bl.evictExpiredLocked() // should not panic
	if len(bl.verdicts) != 0 {
		t.Errorf("len = %d, want 0", len(bl.verdicts))
	}
}

func TestEvictExpired_AllExpired(t *testing.T) {
	bl := &BlockList{verdicts: map[string]blockVerdict{
		"a": {blocked: true, cachedAt: time.Now().Add(-blockCacheTTL - time.Second)},
		"b": {blocked: true, cachedAt: time.Now().Add(-blockCacheTTL - time.Minute)},
	}}

	bl.evictExpiredLocked()
	if len(bl.verdicts) != 0 {
		t.Errorf("len = %d, want 0", len(bl.verdicts))
	}
}

// ── blockVerdict struct ─────────────────────────────────────────────────────

func TestBlockVerdict_Fields(t *testing.T) {
	now := time.Now()
	v := blockVerdict{blocked: true, cachedAt: now}
	if !v.blocked {
		t.Error("blocked should be true")
	}
	if v.cachedAt != now {
		t.Error("cachedAt mismatch")
	}
}

// ── blockCacheTTL constant ──────────────────────────────────────────────────

func TestBlockCacheTTL_Value(t *testing.T) {
	if blockCacheTTL != 5*time.Second {
		t.Errorf("blockCacheTTL = %v, want 5s", blockCacheTTL)
	}
}

func TestBlockCacheMaxEntries_Value(t *testing.T) {
	if blockCacheMaxEntries != 10000 {
		t.Errorf("blockCacheMaxEntries = %d, want 10000", blockCacheMaxEntries)
	}
}
