import { describe, it, expect } from 'vitest';
import { DNSPacketCodec } from '@web/utilities/DNSPacketCodec';
import {
  QTYPE,
  buildQuery,
  buildTruncatedQuery,
  buildResponse,
  buildEmptyAnswerResponse,
  ipToRdata,
  ipv6ToRdata,
  encodeName,
} from '@testUtils/dnsPackets';

describe('DNSPacketCodec.parseQueryType', () => {
  const cases: Array<[number, string]> = [
    [QTYPE.A, 'A'],
    [QTYPE.NS, 'NS'],
    [QTYPE.CNAME, 'CNAME'],
    [QTYPE.SOA, 'SOA'],
    [QTYPE.PTR, 'PTR'],
    [QTYPE.MX, 'MX'],
    [QTYPE.TXT, 'TXT'],
    [QTYPE.AAAA, 'AAAA'],
  ];

  it.each(cases)('maps qtype %i to %s', (qtype, label) => {
    const query = buildQuery('example.com', qtype);
    expect(DNSPacketCodec.parseQueryType(query)).toBe(label);
  });

  it('returns "Unknown (<code>)" for an unrecognized qtype', () => {
    const query = buildQuery('example.com', 999);
    expect(DNSPacketCodec.parseQueryType(query)).toBe('Unknown (999)');
  });

  it('returns "Unknown (malformed)" when there is no room for QTYPE', () => {
    const query = buildTruncatedQuery();
    expect(DNSPacketCodec.parseQueryType(query)).toBe('Unknown (malformed)');
  });
});

describe('DNSPacketCodec.parseQueryName', () => {
  it('parses a simple multi-label name', () => {
    const query = buildQuery('www.example.com');
    expect(DNSPacketCodec.parseQueryName(query)).toBe('www.example.com');
  });

  it('parses a single-label name', () => {
    const query = buildQuery('localhost');
    expect(DNSPacketCodec.parseQueryName(query)).toBe('localhost');
  });

  it('follows a single compression pointer', () => {
    const question = buildQuery('a.com').subarray(12);
    const header = buildQuery('a.com').subarray(0, 12);
    const pointerName = Buffer.from([0xc0, 0x0c]); // points at offset 12
    const packet = Buffer.concat([header, question, pointerName]);
    expect(DNSPacketCodec.parseQueryName(packet, header.length + question.length)).toBe('a.com');
  });

  it('caps pointer loops at MAX_JUMPS instead of infinite-looping', () => {
    // Two pointers referencing each other at offsets 12 and 14.
    const header = Buffer.alloc(12);
    const selfPointerA = Buffer.from([0xc0, 14]); // at offset 12, points to 14
    const selfPointerB = Buffer.from([0xc0, 12]); // at offset 14, points to 12
    const packet = Buffer.concat([header, selfPointerA, selfPointerB]);

    const start = Date.now();
    const result = DNSPacketCodec.parseQueryName(packet, 12);
    expect(Date.now() - start).toBeLessThan(1000);
    expect(result).toBe(''); // loop guard bails before collecting any label
  });

  it('stops gracefully on a truncated pointer at the end of the buffer', () => {
    const packet = Buffer.concat([Buffer.alloc(12), Buffer.from([0xc0])]); // pointer byte with no second byte
    expect(DNSPacketCodec.parseQueryName(packet, 12)).toBe('');
  });

  it('stops gracefully on a truncated label (declared length exceeds buffer)', () => {
    const packet = Buffer.concat([Buffer.alloc(12), Buffer.from([0x05, 0x61, 0x62])]); // length=5 but only 2 bytes follow
    expect(DNSPacketCodec.parseQueryName(packet, 12)).toBe('');
  });
});

describe('DNSPacketCodec.buildResponsePayload', () => {
  it('builds an A-record answer when the query matches the domain', () => {
    const query = buildQuery('nexoral.local');
    const response = DNSPacketCodec.buildResponsePayload(query, 'nexoral.local', '192.168.1.10', 300);

    expect(response.readUInt16BE(0)).toBe(query.readUInt16BE(0)); // txid preserved
    expect(response.readUInt16BE(2)).toBe(0x8180); // standard response flags
    expect(response.readUInt16BE(6)).toBe(1); // ANCOUNT = 1

    const answer = DNSPacketCodec.parseDNSResponse(response, 'A');
    expect(answer).toEqual({ type: 'A', name: 'nexoral.local', value: '192.168.1.10', ttl: 300 });
  });

  it('sets ANCOUNT=0 and appends no answer bytes when the domain does not match', () => {
    const query = buildQuery('other.local');
    const response = DNSPacketCodec.buildResponsePayload(query, 'nexoral.local', '192.168.1.10', 300);

    expect(response.readUInt16BE(6)).toBe(0); // ANCOUNT
    const question = response.subarray(12);
    expect(response.length).toBe(12 + question.length);
  });

  it('encodes the TTL as a 32-bit big-endian value', () => {
    const query = buildQuery('a.b');
    const ttl = 0xdeadbeef >>> 1;
    const response = DNSPacketCodec.buildResponsePayload(query, 'a.b', '1.2.3.4', ttl);
    expect(DNSPacketCodec.parseDNSResponse(response, 'A')?.ttl).toBe(ttl);
  });
});

describe('DNSPacketCodec.parseDNSResponse', () => {
  it('extracts an A record answer', () => {
    const response = buildResponse('nexoral.local', QTYPE.A, 0xabcd, {
      type: QTYPE.A,
      ttl: 120,
      rdata: ipToRdata('10.0.0.1'),
    });
    expect(DNSPacketCodec.parseDNSResponse(response, 'A')).toEqual({
      type: 'A',
      name: 'nexoral.local',
      value: '10.0.0.1',
      ttl: 120,
    });
  });

  it('extracts an AAAA record answer', () => {
    const response = buildResponse('v6.local', QTYPE.AAAA, 0x1, {
      type: QTYPE.AAAA,
      ttl: 60,
      rdata: ipv6ToRdata('2001:db8:0:0:0:0:0:1'),
    });
    expect(DNSPacketCodec.parseDNSResponse(response, 'AAAA')).toEqual({
      type: 'AAAA',
      name: 'v6.local',
      value: '2001:db8:0:0:0:0:0:1',
      ttl: 60,
    });
  });

  it('returns null when ANCOUNT is 0', () => {
    const response = buildEmptyAnswerResponse('nowhere.local', QTYPE.A, 0x1);
    expect(DNSPacketCodec.parseDNSResponse(response, 'A')).toBeNull();
  });

  it('returns null when the answer type/rdlength combination is unsupported', () => {
    const response = buildResponse('mx.local', QTYPE.MX, 0x1, {
      type: QTYPE.MX,
      ttl: 60,
      rdata: Buffer.from([0x00, 0x0a, 0x03, 0x66, 0x6f, 0x6f]),
    });
    expect(DNSPacketCodec.parseDNSResponse(response, 'MX')).toBeNull();
  });

  it('returns null instead of throwing on a corrupt/short buffer', () => {
    const garbage = Buffer.from([0x00, 0x01]);
    expect(DNSPacketCodec.parseDNSResponse(garbage, 'A')).toBeNull();
  });

  it('handles multiple questions when walking past the question section', () => {
    const q1 = encodeName('one.local');
    const q2 = encodeName('two.local');
    const qtypeClass = Buffer.from([0x00, 0x01, 0x00, 0x01]);
    const header = Buffer.alloc(12);
    header.writeUInt16BE(0x2222, 0);
    header.writeUInt16BE(0x8180, 2);
    header.writeUInt16BE(2, 4); // qdcount = 2
    header.writeUInt16BE(1, 6); // ancount = 1
    const questions = Buffer.concat([q1, qtypeClass, q2, qtypeClass]);
    const answerName = Buffer.from([0xc0, 12 + q1.length + 4]); // pointer to "two.local"
    const rr = Buffer.concat([
      answerName,
      Buffer.from([0x00, 0x01, 0x00, 0x01]),
      Buffer.from([0x00, 0x00, 0x00, 0x3c]),
      Buffer.from([0x00, 0x04]),
      ipToRdata('8.8.8.8'),
    ]);
    const response = Buffer.concat([header, questions, rr]);

    expect(DNSPacketCodec.parseDNSResponse(response, 'A')).toEqual({
      type: 'A',
      name: 'two.local',
      value: '8.8.8.8',
      ttl: 60,
    });
  });
});
