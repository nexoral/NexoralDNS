package netutil

import (
	"testing"
)

// ── ListenDNSUDP ────────────────────────────────────────────────────────────

func TestListenDNSUDP_BindsToPort(t *testing.T) {
	conn, err := ListenDNSUDP("127.0.0.1", 0) // port 0 = OS picks a free port
	if err != nil {
		t.Fatalf("ListenDNSUDP failed: %v", err)
	}
	defer conn.Close()

	addr := conn.LocalAddr().String()
	if addr == "" {
		t.Error("LocalAddr is empty")
	}
}

func TestListenDNSUDP_ClosesCleanly(t *testing.T) {
	conn, err := ListenDNSUDP("127.0.0.1", 0)
	if err != nil {
		t.Fatalf("ListenDNSUDP failed: %v", err)
	}
	if err := conn.Close(); err != nil {
		t.Errorf("Close failed: %v", err)
	}
}

// ── ListenDNSTCP ────────────────────────────────────────────────────────────

func TestListenDNSTCP_BindsToPort(t *testing.T) {
	ln, err := ListenDNSTCP("127.0.0.1", 0)
	if err != nil {
		t.Fatalf("ListenDNSTCP failed: %v", err)
	}
	defer ln.Close()

	addr := ln.Addr().String()
	if addr == "" {
		t.Error("Addr is empty")
	}
}

func TestListenDNSTCP_ClosesCleanly(t *testing.T) {
	ln, err := ListenDNSTCP("127.0.0.1", 0)
	if err != nil {
		t.Fatalf("ListenDNSTCP failed: %v", err)
	}
	if err := ln.Close(); err != nil {
		t.Errorf("Close failed: %v", err)
	}
}

// ── TuneSocketBuffers ───────────────────────────────────────────────────────

func TestTuneSocketBuffers_DoesNotPanic(t *testing.T) {
	conn, err := ListenDNSUDP("127.0.0.1", 0)
	if err != nil {
		t.Fatalf("ListenDNSUDP failed: %v", err)
	}
	defer conn.Close()

	TuneSocketBuffers(conn) // should not panic
}

// ── grantedBufferSizes ──────────────────────────────────────────────────────

func TestGrantedBufferSizes_ReturnsValues(t *testing.T) {
	conn, err := ListenDNSUDP("127.0.0.1", 0)
	if err != nil {
		t.Fatalf("ListenDNSUDP failed: %v", err)
	}
	defer conn.Close()

	recv, send := grantedBufferSizes(conn)
	if recv <= 0 {
		t.Errorf("recv = %d, want > 0", recv)
	}
	if send <= 0 {
		t.Errorf("send = %d, want > 0", send)
	}
}

// ── ListenerCount ───────────────────────────────────────────────────────────

func TestListenerCount_ReasonableRange(t *testing.T) {
	count := ListenerCount()
	if count < 1 {
		t.Errorf("ListenerCount = %d, want >= 1", count)
	}
	if count > 100 {
		t.Errorf("ListenerCount = %d, unreasonably high", count)
	}
}

// ── setSockOpts ─────────────────────────────────────────────────────────────

func TestSetSockOpts_ReusePortTrue(t *testing.T) {
	fn := setSockOpts(true)
	if fn == nil {
		t.Error("setSockOpts(true) returned nil")
	}
}

func TestSetSockOpts_ReusePortFalse(t *testing.T) {
	fn := setSockOpts(false)
	if fn == nil {
		t.Error("setSockOpts(false) returned nil")
	}
}
