package cache

import "testing"

// ── matchesWildcard ─────────────────────────────────────────────────────────

func TestMatchesWildcard_ExactMatch(t *testing.T) {
	if !matchesWildcard("example.com", "example.com") {
		t.Error("exact match should block")
	}
}

func TestMatchesWildcard_Subdomain(t *testing.T) {
	if !matchesWildcard("example.com", "sub.example.com") {
		t.Error("subdomain should be blocked by parent")
	}
}

func TestMatchesWildcard_DeepSubdomain(t *testing.T) {
	if !matchesWildcard("example.com", "a.b.c.example.com") {
		t.Error("deep subdomain should be blocked by parent")
	}
}

func TestMatchesWildcard_NotSubdomain(t *testing.T) {
	if matchesWildcard("example.com", "notexample.com") {
		t.Error("prefix match should not block")
	}
}

func TestMatchesWildcard_WildcardPrefix(t *testing.T) {
	if !matchesWildcard("*.example.com", "sub.example.com") {
		t.Error("*.example.com should block sub.example.com")
	}
}

func TestMatchesWildcard_WildcardPrefix_BaseDomain(t *testing.T) {
	if !matchesWildcard("*.example.com", "example.com") {
		t.Error("*.example.com should block example.com")
	}
}

func TestMatchesWildcard_WildcardPrefix_NoMatch(t *testing.T) {
	if matchesWildcard("*.example.com", "other.com") {
		t.Error("*.example.com should not block other.com")
	}
}

func TestMatchesWildcard_WildcardSuffix(t *testing.T) {
	if !matchesWildcard("google.*", "google.com") {
		t.Error("google.* should block google.com")
	}
}

func TestMatchesWildcard_WildcardSuffix_CoUK(t *testing.T) {
	if !matchesWildcard("google.*", "google.co.uk") {
		t.Error("google.* should block google.co.uk")
	}
}

func TestMatchesWildcard_WildcardSuffix_NoMatch(t *testing.T) {
	if matchesWildcard("google.*", "googlexyz.com") {
		t.Error("google.* should not block googlexyz.com")
	}
}

func TestMatchesWildcard_FullInternetBlock(t *testing.T) {
	if !matchesWildcard("*", "anything.example.com") {
		t.Error("* should block everything")
	}
}

func TestMatchesWildcard_FullInternetBlock_SingleLabel(t *testing.T) {
	if !matchesWildcard("*", "localhost") {
		t.Error("* should block localhost")
	}
}

func TestMatchesWildcard_JSONEntry(t *testing.T) {
	entry := `{"domain":"*.example.com","id":"123"}`
	if !matchesWildcard(entry, "sub.example.com") {
		t.Error("JSON wildcard entry should block sub.example.com")
	}
}

func TestMatchesWildcard_JSONEntry_ExactDomain(t *testing.T) {
	entry := `{"domain":"example.com","id":"123"}`
	if !matchesWildcard(entry, "sub.example.com") {
		t.Error("JSON exact entry should block sub.example.com")
	}
}

func TestMatchesWildcard_JSONEntry_NoMatch(t *testing.T) {
	entry := `{"domain":"example.com","id":"123"}`
	if matchesWildcard(entry, "other.com") {
		t.Error("JSON entry should not block other.com")
	}
}

func TestMatchesWildcard_InvalidJSON_FallsBackToRaw(t *testing.T) {
	entry := "not-json-but-valid-domain.com"
	if !matchesWildcard(entry, "sub.not-json-but-valid-domain.com") {
		t.Error("invalid JSON should fall back to raw string matching")
	}
}

func TestMatchesWildcard_EmptyDomain(t *testing.T) {
	if matchesWildcard("example.com", "") {
		t.Error("empty domain should not match")
	}
}

func TestMatchesWildcard_EmptyEntry(t *testing.T) {
	if matchesWildcard("", "example.com") {
		t.Error("empty entry should not match")
	}
}

func TestMatchesWildcard_BothEmpty(t *testing.T) {
	// empty == empty is a match by the final fallback
	if !matchesWildcard("", "") {
		t.Error("empty == empty should match")
	}
}
