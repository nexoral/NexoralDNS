package dnsmsg

import (
	"encoding/binary"
	"net"
	"strings"
)

// BuildResponsePayload builds an answer for msg. When the question name matches
// domain an A record for responseIP is appended; otherwise the answer count is
// left at zero and only the question is echoed back.
func BuildResponsePayload(msg []byte, domain, responseIP string, ttl uint32) []byte {
	// Walk the question name, bounded so a truncated packet with no null
	// terminator cannot spin.
	offset := headerLen
	var labels []string
	for offset < len(msg) && msg[offset] != 0 {
		length := int(msg[offset])
		if offset+1+length > len(msg) {
			break // truncated label
		}
		labels = append(labels, string(msg[offset+1:offset+1+length]))
		offset += length + 1
	}
	queryName := strings.Join(labels, ".")
	question := clamp(msg, headerLen, offset+5)

	out := make([]byte, 0, headerLen+len(question)+16)
	out = append(out, clamp(msg, 0, 2)...) // transaction ID
	for len(out) < 2 {
		out = append(out, 0) // msg was shorter than a transaction ID
	}
	out = append(out, 0x81, 0x80) // flags: response, recursion available
	out = append(out, 0x00, 0x01) // qdcount

	if queryName == domain {
		out = append(out, 0x00, 0x01) // ancount
	} else {
		out = append(out, 0x00, 0x00)
	}
	out = append(out, 0x00, 0x00) // nscount
	out = append(out, 0x00, 0x00) // arcount
	out = append(out, question...)

	if queryName == domain {
		out = append(out, 0xc0, 0x0c) // name: pointer to the question
		out = append(out, 0x00, 0x01) // type A
		out = append(out, 0x00, 0x01) // class IN
		out = binary.BigEndian.AppendUint32(out, ttl)
		out = append(out, 0x00, 0x04) // rdlength
		out = append(out, ipv4Bytes(responseIP)...)
	}

	return out
}

// ipv4Bytes always returns exactly four octets so rdlength stays truthful.
// A non-IPv4 value (an AAAA record's value, say) yields 0.0.0.0 rather than a
// short rdata field that would corrupt the packet.
func ipv4Bytes(ip string) []byte {
	if v4 := net.ParseIP(ip).To4(); v4 != nil {
		return v4
	}
	return []byte{0, 0, 0, 0}
}

// clamp mirrors Buffer.subarray, which silently clamps out-of-range bounds
// instead of panicking the way a Go slice expression would.
func clamp(b []byte, lo, hi int) []byte {
	if lo < 0 {
		lo = 0
	}
	if hi > len(b) {
		hi = len(b)
	}
	if lo > hi {
		return nil
	}
	return b[lo:hi]
}
