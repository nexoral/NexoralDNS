// Package dnsmsg implements the DNS wire-format encoding and decoding used on
// the query path. It is a direct port of Web/src/utilities/DNSPacketCodec.ts,
// including its malformed-packet guards.
//
// JavaScript returns undefined for out-of-range buffer reads; Go panics. Every
// read here is therefore explicitly bounds-checked, and each check stands in for
// behaviour the TypeScript got from a surrounding try/catch or from undefined
// propagating harmlessly.
package dnsmsg

import (
	"encoding/binary"
	"net"
	"strconv"
	"strings"
)

// headerLen is the fixed DNS header size that precedes the question section.
const headerLen = 12

// maxJumps caps compression-pointer hops so a self-referential or cyclic
// pointer cannot loop forever on a single malformed packet.
const maxJumps = 8

// Record is one decoded answer from a DNS response.
type Record struct {
	Type  string `json:"type"  bson:"type"`
	Name  string `json:"name"  bson:"name"`
	Value string `json:"value" bson:"value"`
	TTL   uint32 `json:"ttl"   bson:"ttl"`
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

// ParseQueryName decodes the question name starting at the standard offset.
func ParseQueryName(msg []byte) string { return ParseQueryNameAt(msg, headerLen) }

// ParseQueryNameAt decodes a (possibly compressed) name starting at offset.
func ParseQueryNameAt(msg []byte, offset int) string {
	var labels []string
	jumped := false
	jumps := 0

	for offset >= 0 && offset < len(msg) {
		length := int(msg[offset])

		if length == 0 {
			if !jumped {
				offset++
			}
			break
		}

		if length&0xC0 == 0xC0 {
			if offset+1 >= len(msg) {
				break // truncated pointer
			}
			jumps++
			if jumps > maxJumps {
				break // pointer loop guard
			}
			offset = (length&0x3F)<<8 | int(msg[offset+1])
			jumped = true
			continue
		}

		if offset+1+length > len(msg) {
			break // truncated label
		}
		labels = append(labels, string(msg[offset+1:offset+1+length]))
		offset += length + 1
	}

	return strings.Join(labels, ".")
}

// ParseQueryType returns the QTYPE of the question as a mnemonic.
func ParseQueryType(msg []byte) string {
	offset := headerLen
	// Bounded walk: a truncated question with no null terminator must not spin.
	for offset < len(msg) && msg[offset] != 0 {
		offset += int(msg[offset]) + 1
	}
	offset++

	if offset < 0 || offset+2 > len(msg) {
		return "Unknown (malformed)" // no room for QTYPE
	}

	switch qtype := binary.BigEndian.Uint16(msg[offset:]); qtype {
	case 1:
		return "A"
	case 2:
		return "NS"
	case 5:
		return "CNAME"
	case 6:
		return "SOA"
	case 12:
		return "PTR"
	case 15:
		return "MX"
	case 16:
		return "TXT"
	case 28:
		return "AAAA"
	default:
		return "Unknown (" + strconv.Itoa(int(qtype)) + ")"
	}
}

// ParseDNSResponse extracts the first answer record from a response so it can be
// cached. Returns nil when the response carries no answers or is unparseable.
func ParseDNSResponse(response []byte, queryType string) *Record {
	if len(response) < headerLen {
		return nil
	}

	offset := headerLen

	// Skip the question section.
	qdcount := int(binary.BigEndian.Uint16(response[4:]))
	for range qdcount {
		for offset < len(response) && response[offset] != 0 {
			if response[offset]&0xC0 == 0xC0 {
				offset += 2
				break
			}
			offset += int(response[offset]) + 1
		}
		if offset < len(response) && response[offset] == 0 {
			offset++
		}
		offset += 4 // QTYPE + QCLASS
	}

	if binary.BigEndian.Uint16(response[6:]) == 0 {
		return nil // no answers
	}

	if offset < 0 || offset >= len(response) {
		return nil
	}
	name := ParseQueryNameAt(response, offset)

	// Skip the answer's owner name.
	if response[offset]&0xC0 == 0xC0 {
		offset += 2
	} else {
		for offset < len(response) && response[offset] != 0 {
			offset += int(response[offset]) + 1
		}
		offset++
	}

	if offset < 0 || offset+10 > len(response) {
		return nil // no room for TYPE + CLASS + TTL + RDLENGTH
	}
	recordType := binary.BigEndian.Uint16(response[offset:])
	offset += 4 // TYPE + CLASS
	ttl := binary.BigEndian.Uint32(response[offset:])
	offset += 4
	rdlength := int(binary.BigEndian.Uint16(response[offset:]))
	offset += 2

	if offset+rdlength > len(response) {
		return nil // rdata truncated
	}

	var value string
	switch {
	case recordType == 1 && rdlength == 4:
		value = net.IP(response[offset : offset+4]).String()
	case recordType == 28 && rdlength == 16:
		// Groups are emitted unpadded and uncompressed, matching the original
		// formatting exactly — net.IP.String() would collapse zero runs to "::".
		groups := make([]string, 8)
		for i := range groups {
			groups[i] = strconv.FormatUint(uint64(binary.BigEndian.Uint16(response[offset+i*2:])), 16)
		}
		value = strings.Join(groups, ":")
	}

	if value == "" {
		return nil
	}

	return &Record{Type: queryType, Name: name, Value: value, TTL: ttl}
}

// ModifyResponseTTL rewrites the TTL of every answer, authority and additional
// record in a raw response. The input is left untouched.
func ModifyResponseTTL(response []byte, newTTL uint32) []byte {
	if len(response) < headerLen {
		return response
	}

	modified := make([]byte, len(response))
	copy(modified, response)

	offset := headerLen

	qdcount := int(binary.BigEndian.Uint16(response[4:]))
	for range qdcount {
		for offset < len(response) && response[offset] != 0 {
			if response[offset]&0xC0 == 0xC0 {
				offset += 2
				break
			}
			offset += int(response[offset]) + 1
		}
		if offset < len(response) && response[offset] == 0 {
			offset++
		}
		offset += 4 // QTYPE + QCLASS
	}

	records := int(binary.BigEndian.Uint16(response[6:])) +
		int(binary.BigEndian.Uint16(response[8:])) +
		int(binary.BigEndian.Uint16(response[10:]))

	for range records {
		if offset < 0 || offset >= len(response) {
			break
		}
		if response[offset]&0xC0 == 0xC0 {
			offset += 2
		} else {
			for offset < len(response) && response[offset] != 0 {
				offset += int(response[offset]) + 1
			}
			offset++
		}
		offset += 4 // TYPE + CLASS
		if offset < 0 || offset+4 > len(response) {
			break
		}
		binary.BigEndian.PutUint32(modified[offset:], newTTL)
		offset += 4
		if offset+2 > len(response) {
			break
		}
		offset += 2 + int(binary.BigEndian.Uint16(response[offset:]))
	}

	return modified
}
