// Package server binds the DNS transports — UDP, TCP and DoT — and feeds every
// received query into the shared rules pipeline.
package server

import (
	"context"
	"fmt"
	"net"
	"sync"

	"nexoraldns/web/internal/dnsio"
	"nexoraldns/web/internal/netutil"
	"nexoraldns/web/internal/rules"
	"nexoraldns/web/shared/logger"
)

// DNSPort is the well-known port for DNS over UDP and TCP.
const DNSPort = 53

// readBufferSize accommodates the largest EDNS0 datagram in practice.
const readBufferSize = 4096

// UDP serves DNS over datagrams.
//
// Several sockets share port 53 via SO_REUSEPORT, each drained by its own
// goroutine, so the kernel spreads incoming queries across cores. Every query is
// then handled on its own goroutine, keeping a slow lookup off the read path.
type UDP struct {
	rules *rules.StartRules

	mu    sync.Mutex
	conns []*net.UDPConn
}

func NewUDP(rulesService *rules.StartRules) *UDP {
	return &UDP{rules: rulesService}
}

// Start binds the listeners and keeps them following the host's IP address.
func (u *UDP) Start(ctx context.Context) error {
	ip := netutil.LocalIP(netutil.PreferAny)
	if err := u.bind(ctx, ip); err != nil {
		return err
	}

	go netutil.ScanIPChanges(ctx, ip, func(newIP string) error {
		u.closeListeners()
		return u.bind(ctx, newIP)
	})

	return nil
}

// bind opens one listener per core share and starts draining each.
func (u *UDP) bind(ctx context.Context, ip string) error {
	count := netutil.ListenerCount()

	conns := make([]*net.UDPConn, 0, count)
	for range count {
		conn, err := netutil.ListenDNSUDP(ip, DNSPort)
		if err != nil {
			for _, opened := range conns {
				_ = opened.Close()
			}
			return err
		}
		conns = append(conns, conn)
	}

	u.mu.Lock()
	u.conns = conns
	u.mu.Unlock()

	for _, conn := range conns {
		netutil.TuneSocketBuffers(conn)
		go u.readLoop(ctx, conn, dnsio.NewUDP(conn))
	}

	logger.Info(fmt.Sprintf("DNS server running at udp://%s:%d with %d listeners", ip, DNSPort, count))
	return nil
}

func (u *UDP) readLoop(ctx context.Context, conn *net.UDPConn, handler *dnsio.UDP) {
	buf := make([]byte, readBufferSize)

	for {
		n, addr, err := conn.ReadFromUDP(buf)
		if err != nil {
			// A closed socket means shutdown or a rebind; anything else is a
			// transient read error worth retrying.
			if ctx.Err() != nil || !u.owns(conn) {
				return
			}
			continue
		}

		// The read buffer is reused immediately, so the query must be copied
		// before the handling goroutine can observe it.
		msg := make([]byte, n)
		copy(msg, buf[:n])

		rinfo := dnsio.RemoteInfo{
			Address: addr.IP.String(),
			Family:  "IPv4",
			Port:    addr.Port,
			Size:    n,
			UDPAddr: addr,
		}
		if addr.IP.To4() == nil {
			rinfo.Family = "IPv6"
		}

		go u.rules.Execute(ctx, msg, rinfo, handler)
	}
}

// owns reports whether conn is still one of the live listeners, distinguishing
// a rebind from a transient read failure.
func (u *UDP) owns(conn *net.UDPConn) bool {
	u.mu.Lock()
	defer u.mu.Unlock()
	for _, live := range u.conns {
		if live == conn {
			return true
		}
	}
	return false
}

func (u *UDP) closeListeners() {
	u.mu.Lock()
	conns := u.conns
	u.conns = nil
	u.mu.Unlock()

	for _, conn := range conns {
		_ = conn.Close()
	}
}

func (u *UDP) Close() { u.closeListeners() }
