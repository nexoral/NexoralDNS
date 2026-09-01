package netutil

import "testing"

// ── pickIP ──────────────────────────────────────────────────────────────────

func TestPickIP_PreferWiFi_Found(t *testing.T) {
	byInterface := map[string][]string{
		"wlan0": {"192.168.1.100"},
		"eth0":  {"192.168.1.200"},
	}
	order := []string{"eth0", "wlan0"}
	if got := pickIP(byInterface, order, PreferWiFi); got != "192.168.1.100" {
		t.Errorf("got %q, want 192.168.1.100", got)
	}
}

func TestPickIP_PreferWiFi_FallbackToAny(t *testing.T) {
	byInterface := map[string][]string{
		"eth0": {"192.168.1.200"},
	}
	order := []string{"eth0"}
	if got := pickIP(byInterface, order, PreferWiFi); got != "192.168.1.200" {
		t.Errorf("got %q, want 192.168.1.200", got)
	}
}

func TestPickIP_PreferLAN_Found(t *testing.T) {
	byInterface := map[string][]string{
		"wlan0": {"192.168.1.100"},
		"eth0":  {"192.168.1.200"},
	}
	order := []string{"wlan0", "eth0"}
	if got := pickIP(byInterface, order, PreferLAN); got != "192.168.1.200" {
		t.Errorf("got %q, want 192.168.1.200", got)
	}
}

func TestPickIP_PreferLAN_FallbackToAny(t *testing.T) {
	byInterface := map[string][]string{
		"wlan0": {"192.168.1.100"},
	}
	order := []string{"wlan0"}
	if got := pickIP(byInterface, order, PreferLAN); got != "192.168.1.100" {
		t.Errorf("got %q, want 192.168.1.100", got)
	}
}

func TestPickIP_PreferAny(t *testing.T) {
	byInterface := map[string][]string{
		"enp0s3": {"10.0.0.5"},
	}
	order := []string{"enp0s3"}
	if got := pickIP(byInterface, order, PreferAny); got != "10.0.0.5" {
		t.Errorf("got %q, want 10.0.0.5", got)
	}
}

func TestPickIP_EmptyInterfaces(t *testing.T) {
	if got := pickIP(map[string][]string{}, nil, PreferAny); got != "127.0.0.1" {
		t.Errorf("got %q, want 127.0.0.1", got)
	}
}

func TestPickIP_EmptyAddresses(t *testing.T) {
	byInterface := map[string][]string{"eth0": {}}
	order := []string{"eth0"}
	if got := pickIP(byInterface, order, PreferAny); got != "127.0.0.1" {
		t.Errorf("got %q, want 127.0.0.1", got)
	}
}

func TestPickIP_WiFiVariants(t *testing.T) {
	tests := []struct {
		name string
		ip   string
	}{
		{"wlan0", "192.168.1.1"},
		{"Wi-Fi", "192.168.1.2"},
		{"WIFI0", "192.168.1.3"},
	}
	for _, tt := range tests {
		byInterface := map[string][]string{tt.name: {tt.ip}}
		order := []string{tt.name}
		if got := pickIP(byInterface, order, PreferWiFi); got != tt.ip {
			t.Errorf("pickIP(%q) = %q, want %q", tt.name, got, tt.ip)
		}
	}
}

func TestPickIP_LANVariants(t *testing.T) {
	tests := []struct {
		name string
		ip   string
	}{
		{"eth0", "10.0.0.1"},
		{"enp0s3", "10.0.0.2"},
	}
	for _, tt := range tests {
		byInterface := map[string][]string{tt.name: {tt.ip}}
		order := []string{tt.name}
		if got := pickIP(byInterface, order, PreferLAN); got != tt.ip {
			t.Errorf("pickIP(%q) = %q, want %q", tt.name, got, tt.ip)
		}
	}
}

// ── firstMatching ───────────────────────────────────────────────────────────

func TestFirstMatching_Found(t *testing.T) {
	byInterface := map[string][]string{"wlan0": {"192.168.1.1"}}
	order := []string{"wlan0"}
	if got := firstMatching(byInterface, order, "wlan"); got != "192.168.1.1" {
		t.Errorf("got %q, want 192.168.1.1", got)
	}
}

func TestFirstMatching_NotFound(t *testing.T) {
	byInterface := map[string][]string{"eth0": {"10.0.0.1"}}
	order := []string{"eth0"}
	if got := firstMatching(byInterface, order, "wlan"); got != "" {
		t.Errorf("got %q, want empty", got)
	}
}

func TestFirstMatching_MultiplePatterns(t *testing.T) {
	byInterface := map[string][]string{"enp0s3": {"10.0.0.1"}}
	order := []string{"enp0s3"}
	if got := firstMatching(byInterface, order, "wlan", "enp"); got != "10.0.0.1" {
		t.Errorf("got %q, want 10.0.0.1", got)
	}
}

func TestFirstMatching_EmptyAddresses(t *testing.T) {
	byInterface := map[string][]string{"wlan0": {}}
	order := []string{"wlan0"}
	if got := firstMatching(byInterface, order, "wlan"); got != "" {
		t.Errorf("got %q, want empty", got)
	}
}

// ── ListenerCount ───────────────────────────────────────────────────────────

func TestListenerCount_AtLeastOne(t *testing.T) {
	count := ListenerCount()
	if count < 1 {
		t.Errorf("ListenerCount = %d, want >= 1", count)
	}
}

// ── CurrentIP ───────────────────────────────────────────────────────────────

func TestCurrentIP_ReturnsString(t *testing.T) {
	ip := CurrentIP()
	if ip == "" {
		t.Error("CurrentIP returned empty string")
	}
}

// ── LocalIP ─────────────────────────────────────────────────────────────────

func TestLocalIP_ReturnsString(t *testing.T) {
	ip := LocalIP(PreferAny)
	if ip == "" {
		t.Error("LocalIP returned empty string")
	}
}

func TestLocalIP_LoopbackFallback(t *testing.T) {
	// On any machine, LocalIP should return something (at minimum 127.0.0.1)
	ip := LocalIP(PreferAny)
	if ip == "" {
		t.Error("LocalIP should return at least 127.0.0.1")
	}
}
