// Package dnsmsg implements the DNS wire-format encoding and decoding used on
// the query path. It is a direct port of Web/src/utilities/DNSPacketCodec.ts,
// including its malformed-packet guards.
//
// JavaScript returns undefined for out-of-range buffer reads; Go panics. Every
// read here is therefore explicitly bounds-checked, and each check stands in for
// behaviour the TypeScript got from a surrounding try/catch or from undefined
// propagating harmlessly.
//
// The package is split by direction:
//
//	build.go  — writing an answer packet back to a client
//	parse.go  — reading a query or an upstream response
//	ttl.go    — rewriting TTLs in an already-formed response
package dnsmsg

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
