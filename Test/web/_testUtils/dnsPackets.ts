/**
 * Raw DNS wire-format buffer builders used to exercise DNSPacketCodec, the
 * IO handlers, and the forwarder without depending on any real DNS traffic.
 * Layout follows RFC 1035 §4.1 (12-byte header + question + resource records).
 */

export const QTYPE = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  PTR: 12,
  MX: 15,
  TXT: 16,
  AAAA: 28,
} as const;

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n, 0);
  return b;
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

export function encodeName(name: string): Buffer {
  if (name === '') return Buffer.from([0]);
  const labels = name.split('.').map((part) =>
    Buffer.concat([Buffer.from([part.length]), Buffer.from(part, 'ascii')])
  );
  return Buffer.concat([...labels, Buffer.from([0])]);
}

function buildHeader(
  txid: number,
  qdcount: number,
  ancount: number,
  nscount = 0,
  arcount = 0,
  flags = 0x0100
): Buffer {
  return Buffer.concat([u16(txid), u16(flags), u16(qdcount), u16(ancount), u16(nscount), u16(arcount)]);
}

function buildQuestion(name: string, qtype: number, qclass = 1): Buffer {
  return Buffer.concat([encodeName(name), u16(qtype), u16(qclass)]);
}

/** A standard outbound query: header + single question, no answers. */
export function buildQuery(name: string, qtype: number = QTYPE.A, txid = 0x1234): Buffer {
  return Buffer.concat([buildHeader(txid, 1, 0), buildQuestion(name, qtype)]);
}

/** A query with a corrupted/truncated question section (no null terminator, no room for QTYPE). */
export function buildTruncatedQuery(txid = 0x1234): Buffer {
  const header = buildHeader(txid, 1, 0);
  // A single length byte claiming a label longer than the remaining buffer, no terminator.
  return Buffer.concat([header, Buffer.from([0x05, 0x61, 0x62])]);
}

export function ipToRdata(ip: string): Buffer {
  return Buffer.from(ip.split('.').map((o) => parseInt(o, 10)));
}

/** Fully-expanded IPv6 (8 groups of hex, e.g. "2001:db8:0:0:0:0:0:1") to 16-byte rdata. */
export function ipv6ToRdata(ip: string): Buffer {
  const groups = ip.split(':');
  const buf = Buffer.alloc(16);
  groups.forEach((g, i) => buf.writeUInt16BE(parseInt(g, 16) || 0, i * 2));
  return buf;
}

/** A resource record whose NAME is a compression pointer back to the question (offset 12). */
function buildAnswerRR(type: number, ttl: number, rdata: Buffer, qclass = 1, pointerOffset = 12): Buffer {
  const name = Buffer.from([0xc0, pointerOffset]);
  return Buffer.concat([name, u16(type), u16(qclass), u32(ttl), u16(rdata.length), rdata]);
}

/** A full response: header + question + one answer RR pointing back at the question name. */
export function buildResponse(
  name: string,
  qtype: number,
  txid: number,
  answer: { type: number; ttl: number; rdata: Buffer }
): Buffer {
  const question = buildQuestion(name, qtype);
  const header = buildHeader(txid, 1, 1, 0, 0, 0x8180);
  const rr = buildAnswerRR(answer.type, answer.ttl, answer.rdata);
  return Buffer.concat([header, question, rr]);
}

/** A response with ancount = 0 (e.g. NXDOMAIN-style empty answer section). */
export function buildEmptyAnswerResponse(name: string, qtype: number, txid: number): Buffer {
  const question = buildQuestion(name, qtype);
  const header = buildHeader(txid, 1, 0, 0, 0, 0x8180);
  return Buffer.concat([header, question]);
}
