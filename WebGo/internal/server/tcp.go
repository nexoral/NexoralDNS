package server

import (
	"bufio"
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net"
	"time"

	"nexoraldns/webgo/internal/dnsio"
	"nexoraldns/webgo/internal/netutil"
	"nexoraldns/webgo/internal/rules"
	"nexoraldns/webgo/shared/logger"
)

// idleTimeout closes connections that go quiet. RFC 7766 §6.2.3 recommends an
// idle timeout for DNS over TCP; RFC 7858 §6.2.1 sets a 10s floor for DoT.
const idleTimeout = 30 * time.Second

// TCP serves DNS over stream connections (RFC 1035 §4.2.2 / RFC 7766).
//
// Binds the same LAN address as the UDP service rather than every interface, so
// it does not collide with systemd-resolved holding TCP/53 on 127.0.0.53. TCP
// and UDP port 53 are separate kernel sockets and coexist.
type TCP struct {
	rules    *rules.StartRules
	listener net.Listener
}

func NewTCP(rulesService *rules.StartRules) *TCP {
	return &TCP{rules: rulesService}
}

func (t *TCP) Start(ctx context.Context) error {
	ip := netutil.LocalIP(netutil.PreferAny)

	listener, err := netutil.ListenDNSTCP(ip, DNSPort)
	if err != nil {
		return err
	}
	t.listener = listener

	logger.Info(fmt.Sprintf("DNS TCP server running at tcp://%s:%d", ip, DNSPort))
	go acceptLoop(ctx, listener, t.rules, "TCP")
	return nil
}

func (t *TCP) Close() {
	if t.listener != nil {
		_ = t.listener.Close()
	}
}

// acceptLoop hands each connection its own goroutine. Shared by TCP and DoT.
func acceptLoop(ctx context.Context, listener net.Listener, rulesService *rules.StartRules, label string) {
	for {
		conn, err := listener.Accept()
		if err != nil {
			if ctx.Err() != nil || errors.Is(err, net.ErrClosed) {
				return
			}
			logger.Error(fmt.Sprintf("DNS %s server error:", label), err)
			continue
		}
		go serveConn(ctx, conn, rulesService, label)
	}
}

// serveConn reads length-prefixed queries until the peer goes away.
//
// Messages on one connection are answered in order, matching the client's
// expectation for a stream transport; parallelism comes from serving many
// connections at once.
func serveConn(ctx context.Context, conn net.Conn, rulesService *rules.StartRules, label string) {
	defer conn.Close()

	handler := dnsio.NewTCP(conn)
	rinfo := handler.RemoteInfo()
	reader := bufio.NewReader(conn)

	var lengthPrefix [2]byte
	for {
		if err := conn.SetDeadline(time.Now().Add(idleTimeout)); err != nil {
			return
		}

		if _, err := io.ReadFull(reader, lengthPrefix[:]); err != nil {
			logDisconnect(err, label, rinfo.Address)
			return
		}

		msg := make([]byte, binary.BigEndian.Uint16(lengthPrefix[:]))
		if _, err := io.ReadFull(reader, msg); err != nil {
			logDisconnect(err, label, rinfo.Address)
			return
		}

		rinfo.Size = len(msg)
		rulesService.Execute(ctx, msg, rinfo, handler)
	}
}

// logDisconnect reports why a connection ended, staying quiet for the ordinary
// case of a client that simply finished and hung up.
func logDisconnect(err error, label, address string) {
	var netErr net.Error
	switch {
	case errors.Is(err, io.EOF), errors.Is(err, io.ErrUnexpectedEOF):
		return
	case errors.As(err, &netErr) && netErr.Timeout():
		logger.Error(fmt.Sprintf("DNS %s connection timeout [%s]", label, address))
	default:
		logger.Error(fmt.Sprintf("DNS %s connection error [%s]: %v", label, address, err))
	}
}
