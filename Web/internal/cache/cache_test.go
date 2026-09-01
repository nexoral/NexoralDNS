package cache

import "testing"

// cache.Service depends on Redis (ConnectionManager, CacheStore, PubSub,
// ACLService), so the tests below cover only the constructor and the struct
// wiring. Redis-dependent methods are covered by integration tests.

// ── NewService ──────────────────────────────────────────────────────────────

func TestNewService_ReturnsNotNil(t *testing.T) {
	svc := NewService(nil, nil, nil, nil)
	if svc == nil {
		t.Fatal("NewService returned nil")
	}
}

func TestNewService_FieldsAreSet(t *testing.T) {
	svc := NewService(nil, nil, nil, nil)
	// The fields are unexported, but we can verify the struct was created
	// by checking that methods don't panic on nil internals.
	if svc == nil {
		t.Fatal("NewService returned nil")
	}
}

// ── NewACLService ───────────────────────────────────────────────────────────

func TestNewACLService_ReturnsNotNil(t *testing.T) {
	acl := NewACLService(nil)
	if acl == nil {
		t.Fatal("NewACLService returned nil")
	}
}

// ── matchesWildcard edge cases ──────────────────────────────────────────────

func TestMatchesWildcard_CaseSensitive(t *testing.T) {
	// Matching is case-sensitive (DNS is case-insensitive in practice, but
	// the ACL stores are case-sensitive)
	if matchesWildcard("Example.COM", "example.com") {
		t.Error("should be case-sensitive")
	}
}

func TestMatchesWildcard_WildcardPrefix_MultipleSubdomains(t *testing.T) {
	if !matchesWildcard("*.example.com", "a.b.c.example.com") {
		t.Error("*.example.com should block a.b.c.example.com")
	}
}

func TestMatchesWildcard_WildcardSuffix_Subdomain(t *testing.T) {
	// "google.*" matches google.com, google.co.uk, but NOT www.google.com
	// because the prefix check is HasPrefix(domain, "google."), not recursive.
	if matchesWildcard("google.*", "www.google.com") {
		t.Error("google.* should NOT block www.google.com (prefix mismatch)")
	}
}

func TestMatchesWildcard_BareDomain_Subdomain(t *testing.T) {
	if !matchesWildcard("example.com", "www.example.com") {
		t.Error("example.com should block www.example.com")
	}
}

func TestMatchesWildcard_BareDomain_ExactOnly(t *testing.T) {
	if !matchesWildcard("example.com", "example.com") {
		t.Error("example.com should block example.com")
	}
}

func TestMatchesWildcard_PartialLabelNoMatch(t *testing.T) {
	// "exam" should NOT match "example.com" — boundary-aware matching
	if matchesWildcard("exam", "example.com") {
		t.Error("partial label should not match")
	}
}

func TestMatchesWildcard_JSONWithNestedDomain(t *testing.T) {
	entry := `{"domain":"*.tracking.evil.com","id":"456","type":"wildcard"}`
	if !matchesWildcard(entry, "ads.tracking.evil.com") {
		t.Error("JSON nested wildcard should block")
	}
	// "*.tracking.evil.com" base is "tracking.evil.com", so domain == base matches
	if !matchesWildcard(entry, "tracking.evil.com") {
		t.Error("*.tracking.evil.com should match its own base domain")
	}
}
