package dnsmsg

import "encoding/binary"

// ModifyResponseTTL rewrites the TTL of every answer, authority and additional
// record in a raw response. The input is left untouched.
func ModifyResponseTTL(response []byte, newTTL uint32) []byte {
	if len(response) < headerLen {
		return response
	}

	modified := make([]byte, len(response))
	copy(modified, response)

	offset := skipQuestions(response, headerLen)

	records := int(binary.BigEndian.Uint16(response[6:])) +
		int(binary.BigEndian.Uint16(response[8:])) +
		int(binary.BigEndian.Uint16(response[10:]))

	for range records {
		if offset < 0 || offset >= len(response) {
			break
		}
		offset = skipName(response, offset)

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
