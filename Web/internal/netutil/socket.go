package netutil

import (
	"context"
	"fmt"
	"net"
	"runtime"
	"strconv"
	"syscall"

	"golang.org/x/sys/unix"

	"nexoraldns/webgo/shared/logger"
)

// socketBufferSize is requested for both directions so a burst of queries is not
// silently dropped by the kernel before the reader gets to them. The OS caps the
// grant at net.core.rmem_max / wmem_max.
const socketBufferSize = 4 * 1024 * 1024

// ListenerCount is how many sockets share port 53.
//
// The Node build forked one worker process per 75% of CPUs, each binding its own
// SO_REUSEPORT socket. This build stays in one process and opens the same number
// of sockets, each drained by its own goroutine — the kernel load-balances
// across them exactly as before, without the cost of forking.
func ListenerCount() int {
	return max(1, runtime.NumCPU()*3/4)
}

// setSockOpts applies socket options before bind.
//
// SO_REUSEPORT is set only for the UDP listeners, which deliberately share port
// 53 so the kernel can spread datagrams across them. The stream listener must
// not set it: a single listener gains nothing, and SO_REUSEPORT would let a
// second process silently bind the same port and steal half the connections
// instead of failing loudly with EADDRINUSE.
func setSockOpts(reusePort bool) func(string, string, syscall.RawConn) error {
	return func(_, _ string, c syscall.RawConn) error {
		var sockErr error
		err := c.Control(func(fd uintptr) {
			if err := unix.SetsockoptInt(int(fd), unix.SOL_SOCKET, unix.SO_REUSEADDR, 1); err != nil {
				sockErr = err
				return
			}
			if reusePort {
				sockErr = unix.SetsockoptInt(int(fd), unix.SOL_SOCKET, unix.SO_REUSEPORT, 1)
			}
		})
		if err != nil {
			return err
		}
		return sockErr
	}
}

// ListenDNSUDP binds one UDP listener for the DNS service.
func ListenDNSUDP(ip string, port int) (*net.UDPConn, error) {
	lc := net.ListenConfig{Control: setSockOpts(true)}

	packetConn, err := lc.ListenPacket(context.Background(), "udp4", net.JoinHostPort(ip, strconv.Itoa(port)))
	if err != nil {
		return nil, err
	}

	conn, ok := packetConn.(*net.UDPConn)
	if !ok {
		_ = packetConn.Close()
		return nil, fmt.Errorf("expected a UDP connection, got %T", packetConn)
	}
	return conn, nil
}

// ListenDNSTCP binds the stream listener for DNS over TCP or TLS.
func ListenDNSTCP(ip string, port int) (net.Listener, error) {
	lc := net.ListenConfig{Control: setSockOpts(false)}
	return lc.Listen(context.Background(), "tcp4", net.JoinHostPort(ip, strconv.Itoa(port)))
}

// TuneSocketBuffers enlarges the socket's kernel buffers and logs what the OS
// actually granted, so a low net.core ceiling is visible rather than assumed.
func TuneSocketBuffers(conn *net.UDPConn) {
	if err := conn.SetReadBuffer(socketBufferSize); err != nil {
		logger.Warn(fmt.Sprintf("Could not resize UDP socket buffers: %v", err))
		return
	}
	if err := conn.SetWriteBuffer(socketBufferSize); err != nil {
		logger.Warn(fmt.Sprintf("Could not resize UDP socket buffers: %v", err))
		return
	}

	recv, send := grantedBufferSizes(conn)
	logger.Info(fmt.Sprintf(
		"DNS UDP socket buffers granted: recv=%d send=%d (raise net.core.rmem_max/wmem_max if lower than requested)",
		recv, send))
}

// grantedBufferSizes reads back what the kernel allowed. Linux reports double
// the requested value here, which is its documented bookkeeping overhead.
func grantedBufferSizes(conn *net.UDPConn) (recv, send int) {
	rawConn, err := conn.SyscallConn()
	if err != nil {
		return 0, 0
	}
	_ = rawConn.Control(func(fd uintptr) {
		recv, _ = unix.GetsockoptInt(int(fd), unix.SOL_SOCKET, unix.SO_RCVBUF)
		send, _ = unix.GetsockoptInt(int(fd), unix.SOL_SOCKET, unix.SO_SNDBUF)
	})
	return recv, send
}
