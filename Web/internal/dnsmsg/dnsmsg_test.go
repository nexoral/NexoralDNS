package dnsmsg

import (
	"encoding/binary"
	"net"
	"testing"
)

// ── helpers ──────────────────────────────────────────────────────────────────

func buildQuery(name string, qtype uint16) []byte {
	msg := make([]byte, headerLen)
	binary.BigEndian.PutUint16(msg[0:], 0x1234)
	binary.BigEndian.PutUint16(msg[2:], 0x0100)
	binary.BigEndian.PutUint16(msg[4:], 1)

	for _, label := range splitLabels(name) {
		msg = append(msg, byte(len(label)))
		msg = append(msg, []byte(label)...)
	}
	msg = append(msg, 0)

	msg = binary.BigEndian.AppendUint16(msg, qtype)
	msg = binary.BigEndian.AppendUint16(msg, 1)
	return msg
}

func splitLabels(name string) []string {
	if name == "" {
		return nil
	}
	var labels []string
	start := 0
	for i := 0; i < len(name); i++ {
		if name[i] == '.' {
			labels = append(labels, name[start:i])
			start = i + 1
		}
	}
	labels = append(labels, name[start:])
	return labels
}

func buildResponse(name string, ip net.IP, ttl uint32) []byte {
	msg := buildQuery(name, 1)
	binary.BigEndian.PutUint16(msg[2:], 0x8180)
	binary.BigEndian.PutUint16(msg[6:], 1)

	msg = append(msg, 0xc0, 0x0c)
	msg = binary.BigEndian.AppendUint16(msg, 1)
	msg = binary.BigEndian.AppendUint16(msg, 1)
	msg = binary.BigEndian.AppendUint32(msg, ttl)
	msg = binary.BigEndian.AppendUint16(msg, 4)
	msg = append(msg, ip.To4()...)
	return msg
}

// ── ParseQueryName ──────────────────────────────────────────────────────────

func TestParseQueryName_Simple(t *testing.T) {
	msg := buildQuery("example.com", 1)
	if got := ParseQueryName(msg); got != "example.com" {
		t.Errorf("got %q, want %q", got, "example.com")
	}
}

func TestParseQueryName_Subdomain(t *testing.T) {
	msg := buildQuery("sub.example.com", 1)
	if got := ParseQueryName(msg); got != "sub.example.com" {
		t.Errorf("got %q, want %q", got, "sub.example.com")
	}
}

func TestParseQueryName_SingleLabel(t *testing.T) {
	msg := buildQuery("localhost", 1)
	if got := ParseQueryName(msg); got != "localhost" {
		t.Errorf("got %q, want %q", got, "localhost")
	}
}

func TestParseQueryName_TruncatedPacket(t *testing.T) {
	if got := ParseQueryName([]byte{0x00}); got != "" {
		t.Errorf("got %q, want empty", got)
	}
}

func TestParseQueryName_TruncatedLabel(t *testing.T) {
	// Label length says 10 but packet only has 2 bytes of data. The bounds
	// check (offset+1+length > len(msg)) fires before any bytes are read.
	msg := make([]byte, headerLen+4)
	binary.BigEndian.PutUint16(msg[4:], 1)
	msg[headerLen] = 10
	msg[headerLen+1] = 'a'
	msg[headerLen+2] = 'b'
	if got := ParseQueryName(msg); got != "" {
		t.Errorf("got %q, want empty (label too long for packet)", got)
	}
}

// ── ParseQueryNameAt compression pointers ───────────────────────────────────

func TestParseQueryNameAt_CompressionPointer(t *testing.T) {
	msg := buildQuery("example.com", 1)
	msg = append(msg, 0xc0, 0x0c)
	if got := ParseQueryNameAt(msg, len(msg)-2); got != "example.com" {
		t.Errorf("got %q, want %q", got, "example.com")
	}
}

func TestParseQueryNameAt_PointerLoopGuard(t *testing.T) {
	msg := make([]byte, 14)
	binary.BigEndian.PutUint16(msg[4:], 1)
	msg[12] = 0xc0
	msg[13] = 0x0c
	got := ParseQueryNameAt(msg, 12)
	if got == "LOOP_DETECTED" {
		t.Error("entered an infinite loop")
	}
}

func TestParseQueryNameAt_TruncatedPointer(t *testing.T) {
	if got := ParseQueryNameAt([]byte{0xc0}, 0); got != "" {
		t.Errorf("got %q, want empty", got)
	}
}

// ── ParseQueryType ──────────────────────────────────────────────────────────

func TestParseQueryType_A(t *testing.T) {
	if got := ParseQueryType(buildQuery("x", 1)); got != "A" {
		t.Errorf("got %q, want A", got)
	}
}

func TestParseQueryType_AAAA(t *testing.T) {
	if got := ParseQueryType(buildQuery("x", 28)); got != "AAAA" {
		t.Errorf("got %q, want AAAA", got)
	}
}

func TestParseQueryType_MX(t *testing.T) {
	if got := ParseQueryType(buildQuery("x", 15)); got != "MX" {
		t.Errorf("got %q, want MX", got)
	}
}

func TestParseQueryType_TXT(t *testing.T) {
	if got := ParseQueryType(buildQuery("x", 16)); got != "TXT" {
		t.Errorf("got %q, want TXT", got)
	}
}

func TestParseQueryType_CNAME(t *testing.T) {
	if got := ParseQueryType(buildQuery("x", 5)); got != "CNAME" {
		t.Errorf("got %q, want CNAME", got)
	}
}

func TestParseQueryType_NS(t *testing.T) {
	if got := ParseQueryType(buildQuery("x", 2)); got != "NS" {
		t.Errorf("got %q, want NS", got)
	}
}

func TestParseQueryType_SOA(t *testing.T) {
	if got := ParseQueryType(buildQuery("x", 6)); got != "SOA" {
		t.Errorf("got %q, want SOA", got)
	}
}

func TestParseQueryType_PTR(t *testing.T) {
	if got := ParseQueryType(buildQuery("x", 12)); got != "PTR" {
		t.Errorf("got %q, want PTR", got)
	}
}

func TestParseQueryType_Unknown(t *testing.T) {
	if got := ParseQueryType(buildQuery("x", 99)); got != "Unknown (99)" {
		t.Errorf("got %q, want %q", got, "Unknown (99)")
	}
}

func TestParseQueryType_Malformed(t *testing.T) {
	msg := make([]byte, headerLen+2)
	binary.BigEndian.PutUint16(msg[4:], 1)
	msg[headerLen] = 3
	if got := ParseQueryType(msg); got != "Unknown (malformed)" {
		t.Errorf("got %q, want %q", got, "Unknown (malformed)")
	}
}

// ── ParseDNSResponse ────────────────────────────────────────────────────────

func TestParseDNSResponse_ARecord(t *testing.T) {
	ip := net.ParseIP("192.168.1.1").To4()
	record := ParseDNSResponse(buildResponse("example.com", ip, 300), "A")
	if record == nil {
		t.Fatal("returned nil")
	}
	if record.Name != "example.com" {
		t.Errorf("Name = %q", record.Name)
	}
	if record.Value != "192.168.1.1" {
		t.Errorf("Value = %q", record.Value)
	}
	if record.TTL != 300 {
		t.Errorf("TTL = %d", record.TTL)
	}
	if record.Type != "A" {
		t.Errorf("Type = %q", record.Type)
	}
}

func TestParseDNSResponse_NoAnswers(t *testing.T) {
	if record := ParseDNSResponse(buildQuery("x", 1), "A"); record != nil {
		t.Errorf("got %v, want nil", record)
	}
}

func TestParseDNSResponse_TruncatedHeader(t *testing.T) {
	if record := ParseDNSResponse([]byte{0x00, 0x01}, "A"); record != nil {
		t.Errorf("got %v, want nil", record)
	}
}

func TestParseDNSResponse_EmptyPacket(t *testing.T) {
	if record := ParseDNSResponse(nil, "A"); record != nil {
		t.Errorf("got %v, want nil", record)
	}
}

func TestParseDNSResponse_AAAARecord(t *testing.T) {
	msg := buildQuery("example.com", 28)
	binary.BigEndian.PutUint16(msg[2:], 0x8180)
	binary.BigEndian.PutUint16(msg[6:], 1)

	msg = append(msg, 0xc0, 0x0c)
	msg = binary.BigEndian.AppendUint16(msg, 28)
	msg = binary.BigEndian.AppendUint16(msg, 1)
	msg = binary.BigEndian.AppendUint32(msg, 600)
	msg = binary.BigEndian.AppendUint16(msg, 16)
	ip := net.ParseIP("2001:db8::1").To16()
	msg = append(msg, ip...)

	record := ParseDNSResponse(msg, "AAAA")
	if record == nil {
		t.Fatal("returned nil")
	}
	if record.Type != "AAAA" {
		t.Errorf("Type = %q", record.Type)
	}
	if record.TTL != 600 {
		t.Errorf("TTL = %d", record.TTL)
	}
	if record.Value == "" {
		t.Error("empty value")
	}
}

// ── BuildResponsePayload ────────────────────────────────────────────────────

func TestBuildResponsePayload_MatchingDomain(t *testing.T) {
	query := buildQuery("example.com", 1)
	resp := BuildResponsePayload(query, "example.com", "10.0.0.1", 120)
	if len(resp) < headerLen {
		t.Fatal("too short")
	}
	if binary.BigEndian.Uint16(resp[2:])&0x8000 == 0 {
		t.Error("response flag not set")
	}
	if ancount := binary.BigEndian.Uint16(resp[6:]); ancount != 1 {
		t.Errorf("ancount = %d, want 1", ancount)
	}
}

func TestBuildResponsePayload_NonMatchingDomain(t *testing.T) {
	query := buildQuery("other.com", 1)
	resp := BuildResponsePayload(query, "example.com", "10.0.0.1", 120)
	if ancount := binary.BigEndian.Uint16(resp[6:]); ancount != 0 {
		t.Errorf("ancount = %d, want 0", ancount)
	}
}

func TestBuildResponsePayload_PreservesTransactionID(t *testing.T) {
	query := buildQuery("example.com", 1)
	binary.BigEndian.PutUint16(query[0:], 0xABCD)
	resp := BuildResponsePayload(query, "example.com", "10.0.0.1", 120)
	if txid := binary.BigEndian.Uint16(resp[0:]); txid != 0xABCD {
		t.Errorf("txid = 0x%04X, want 0xABCD", txid)
	}
}

func TestBuildResponsePayload_TruncatedMsg(t *testing.T) {
	resp := BuildResponsePayload([]byte{0x00}, "example.com", "10.0.0.1", 120)
	if resp == nil {
		t.Error("returned nil")
	}
}

func TestBuildResponsePayload_EmptyMsg(t *testing.T) {
	resp := BuildResponsePayload(nil, "example.com", "10.0.0.1", 120)
	if resp == nil {
		t.Error("returned nil")
	}
}

// ── ModifyResponseTTL ───────────────────────────────────────────────────────

func TestModifyResponseTTL_RewritesTTL(t *testing.T) {
	ip := net.ParseIP("10.0.0.1").To4()
	msg := buildResponse("example.com", ip, 300)
	modified := ModifyResponseTTL(msg, 60)

	offset := skipQuestions(modified, headerLen)
	offset = skipName(modified, offset)
	offset += 4
	if ttl := binary.BigEndian.Uint32(modified[offset:]); ttl != 60 {
		t.Errorf("modified TTL = %d, want 60", ttl)
	}

	origOffset := skipQuestions(msg, headerLen)
	origOffset = skipName(msg, origOffset)
	origOffset += 4
	if origTTL := binary.BigEndian.Uint32(msg[origOffset:]); origTTL != 300 {
		t.Errorf("original TTL = %d, want 300", origTTL)
	}
}

func TestModifyResponseTTL_TruncatedPacket(t *testing.T) {
	short := []byte{0x00, 0x01}
	if modified := ModifyResponseTTL(short, 60); len(modified) != len(short) {
		t.Error("modified a truncated packet")
	}
}

func TestModifyResponseTTL_NilPacket(t *testing.T) {
	if modified := ModifyResponseTTL(nil, 60); modified != nil {
		t.Error("returned non-nil for nil input")
	}
}

// ── clamp ───────────────────────────────────────────────────────────────────

func TestClamp_Normal(t *testing.T) {
	got := clamp([]byte{1, 2, 3, 4, 5}, 1, 4)
	if len(got) != 3 || got[0] != 2 || got[2] != 4 {
		t.Errorf("got %v, want [2 3 4]", got)
	}
}

func TestClamp_LoNegative(t *testing.T) {
	got := clamp([]byte{1, 2, 3}, -1, 2)
	if len(got) != 2 || got[0] != 1 {
		t.Errorf("got %v, want [1 2]", got)
	}
}

func TestClamp_HiExceedsLength(t *testing.T) {
	got := clamp([]byte{1, 2, 3}, 1, 100)
	if len(got) != 2 || got[0] != 2 {
		t.Errorf("got %v, want [2 3]", got)
	}
}

func TestClamp_LoGreaterThanHi(t *testing.T) {
	if got := clamp([]byte{1, 2, 3}, 3, 1); got != nil {
		t.Errorf("got %v, want nil", got)
	}
}

// ── ipv4Bytes ───────────────────────────────────────────────────────────────

func TestIpv4Bytes_Valid(t *testing.T) {
	got := ipv4Bytes("192.168.1.1")
	want := net.ParseIP("192.168.1.1").To4()
	if len(got) != 4 || got[0] != want[0] || got[3] != want[3] {
		t.Errorf("got %v, want %v", got, want)
	}
}

func TestIpv4Bytes_Invalid(t *testing.T) {
	got := ipv4Bytes("not-an-ip")
	if len(got) != 4 || got[0] != 0 || got[3] != 0 {
		t.Errorf("got %v, want [0 0 0 0]", got)
	}
}

func TestIpv4Bytes_IPv6(t *testing.T) {
	got := ipv4Bytes("::1")
	if len(got) != 4 || got[0] != 0 || got[3] != 0 {
		t.Errorf("got %v, want [0 0 0 0]", got)
	}
}
