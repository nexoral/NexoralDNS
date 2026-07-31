// Package dnsio adapts the DNS query pipeline to a transport. The rules engine
// talks only to Handler, so UDP, TCP and DoT share one code path.
package dnsio

import (
	"net"

	"nexoraldns/web/internal/dnsmsg"
)

// RemoteInfo describes the client a query arrived from. For TCP and DoT it is
// synthesised once per connection, since the peer is fixed for its lifetime.
type RemoteInfo struct {
	Address string
	Family  string
	Port    int
	Size    int

	// UDPAddr is the reply destination for datagram transports. It is nil for
	// TCP and DoT, where the handler writes back to its own connection.
	UDPAddr *net.UDPAddr
}

// Handler is the IO contract shared by every DNS transport.
type Handler interface {
	ParseQueryName(msg []byte) string
	ParseQueryType(msg []byte) string
	ParseDNSResponse(response []byte, queryType string) *dnsmsg.Record

	// BuildSendAnswer answers msg with an A record for responseIP when the
	// question name matches domain, and with an empty answer otherwise.
	BuildSendAnswer(msg []byte, rinfo RemoteInfo, domain, responseIP string, ttl uint32) bool

	// SendRawAnswer writes an already-encoded response back to the client.
	SendRawAnswer(msg []byte, rinfo RemoteInfo) bool
}

// parsing supplies the transport-independent half of Handler. Both handlers
// embed it, so parsing lives in exactly one place.
type parsing struct{}

func (parsing) ParseQueryName(msg []byte) string { return dnsmsg.ParseQueryName(msg) }
func (parsing) ParseQueryType(msg []byte) string { return dnsmsg.ParseQueryType(msg) }

func (parsing) ParseDNSResponse(response []byte, queryType string) *dnsmsg.Record {
	return dnsmsg.ParseDNSResponse(response, queryType)
}
