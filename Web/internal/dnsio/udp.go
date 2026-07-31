package dnsio

import (
	"net"
	"sync/atomic"

	"nexoraldns/web/internal/dnsmsg"
)

// UDP writes DNS answers back over a datagram socket. The socket is held in an
// atomic pointer because the IP scanner swaps it out when the host's address
// changes, while query goroutines may be mid-flight.
type UDP struct {
	parsing
	conn atomic.Pointer[net.UDPConn]
}

func NewUDP(conn *net.UDPConn) *UDP {
	h := &UDP{}
	h.conn.Store(conn)
	return h
}

// Rebind points the handler at a new socket after an address change.
func (u *UDP) Rebind(conn *net.UDPConn) { u.conn.Store(conn) }

func (u *UDP) BuildSendAnswer(msg []byte, rinfo RemoteInfo, domain, responseIP string, ttl uint32) bool {
	return u.write(dnsmsg.BuildResponsePayload(msg, domain, responseIP, ttl), rinfo)
}

func (u *UDP) SendRawAnswer(msg []byte, rinfo RemoteInfo) bool {
	return u.write(msg, rinfo)
}

// write reports whether the datagram reached the socket. A closed or rebinding
// socket returns false rather than an error, matching the caller's expectation
// that a failed send is just a dropped answer.
func (u *UDP) write(payload []byte, rinfo RemoteInfo) bool {
	conn := u.conn.Load()
	if conn == nil || rinfo.UDPAddr == nil {
		return false
	}
	_, err := conn.WriteToUDP(payload, rinfo.UDPAddr)
	return err == nil
}
