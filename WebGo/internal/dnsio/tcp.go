package dnsio

import (
	"encoding/binary"
	"net"

	"nexoraldns/webgo/internal/dnsmsg"
)

// TCP writes DNS answers over a stream transport, prefixing each with its
// 2-byte big-endian length per RFC 1035 §4.2.2. One instance per accepted
// connection. Works unchanged for DoT, since a TLS conn is just a net.Conn.
type TCP struct {
	parsing
	conn net.Conn
}

func NewTCP(conn net.Conn) *TCP { return &TCP{conn: conn} }

func (t *TCP) BuildSendAnswer(msg []byte, _ RemoteInfo, domain, responseIP string, ttl uint32) bool {
	return t.writeWithLengthPrefix(dnsmsg.BuildResponsePayload(msg, domain, responseIP, ttl))
}

func (t *TCP) SendRawAnswer(msg []byte, _ RemoteInfo) bool {
	return t.writeWithLengthPrefix(msg)
}

// writeWithLengthPrefix emits the length and payload as one write, so a
// concurrent writer can never interleave between the two.
func (t *TCP) writeWithLengthPrefix(payload []byte) bool {
	if len(payload) > 0xFFFF {
		return false
	}
	framed := make([]byte, 2+len(payload))
	binary.BigEndian.PutUint16(framed, uint16(len(payload)))
	copy(framed[2:], payload)

	_, err := t.conn.Write(framed)
	return err == nil
}

// RemoteInfo describes the peer on the other end of this connection. The
// address is stable for the connection's lifetime, so callers build it once.
func (t *TCP) RemoteInfo() RemoteInfo {
	info := RemoteInfo{Address: "0.0.0.0", Family: "IPv4"}

	addr, ok := t.conn.RemoteAddr().(*net.TCPAddr)
	if !ok {
		return info
	}

	info.Address = addr.IP.String()
	info.Port = addr.Port
	if addr.IP.To4() == nil {
		info.Family = "IPv6"
	}
	return info
}
