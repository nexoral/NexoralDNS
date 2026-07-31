package server

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"

	"nexoraldns/webgo/internal/netutil"
	"nexoraldns/webgo/internal/rules"
	"nexoraldns/webgo/shared/logger"
)

// DoTPort is the well-known port for DNS over TLS.
const DoTPort = 853

// DoT serves DNS over TLS (RFC 7858).
//
// Framing and dispatch are identical to plain TCP once the handshake completes,
// since a TLS connection is just a net.Conn.
type DoT struct {
	rules    *rules.StartRules
	listener net.Listener
}

func NewDoT(rulesService *rules.StartRules) *DoT {
	return &DoT{rules: rulesService}
}

func (d *DoT) Start(ctx context.Context) error {
	certificate, err := LoadOrGenerateCerts()
	if err != nil {
		return err
	}

	ip := netutil.LocalIP(netutil.PreferAny)
	listener, err := netutil.ListenDNSTCP(ip, DoTPort)
	if err != nil {
		return err
	}

	d.listener = tls.NewListener(listener, &tls.Config{
		Certificates: []tls.Certificate{certificate},
		// RFC 7858 §3.1: DoT must support TLS 1.2; 1.3 is preferred.
		MinVersion: tls.VersionTLS12,
	})

	logger.Info(fmt.Sprintf("DNS DoT server running at tls://%s:%d", ip, DoTPort))
	go acceptLoop(ctx, d.listener, d.rules.Execute, "DoT")
	return nil
}

func (d *DoT) Close() {
	if d.listener != nil {
		_ = d.listener.Close()
	}
}
