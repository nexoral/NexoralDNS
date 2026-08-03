package dnsmsg

import (
	"encoding/binary"
	"net"
	"strconv"
	"strings"
)

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

	offset := skipQuestions(response, headerLen)

	if binary.BigEndian.Uint16(response[6:]) == 0 {
		return nil // no answers
	}

	if offset < 0 || offset >= len(response) {
		return nil
	}
	name := ParseQueryNameAt(response, offset)
	offset = skipName(response, offset)

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

// skipQuestions advances offset past every entry in the question section,
// reading QDCOUNT from the header. Shared by response parsing and TTL rewriting,
// which walk the same prefix before reaching the records they care about.
func skipQuestions(msg []byte, offset int) int {
	qdcount := int(binary.BigEndian.Uint16(msg[4:]))
	for range qdcount {
		for offset < len(msg) && msg[offset] != 0 {
			if msg[offset]&0xC0 == 0xC0 {
				offset += 2
				break
			}
			offset += int(msg[offset]) + 1
		}
		if offset < len(msg) && msg[offset] == 0 {
			offset++
		}
		offset += 4 // QTYPE + QCLASS
	}
	return offset
}

// skipName advances offset past one owner name — two bytes if it is a
// compression pointer, otherwise the full label sequence plus its terminator.
// The caller must have checked that offset is within msg.
func skipName(msg []byte, offset int) int {
	if msg[offset]&0xC0 == 0xC0 {
		return offset + 2
	}
	for offset < len(msg) && msg[offset] != 0 {
		offset += int(msg[offset]) + 1
	}
	return offset + 1
}
