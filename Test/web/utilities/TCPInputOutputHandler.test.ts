import { describe, it, expect } from 'vitest';
import TCPInputOutputHandler from '@web/utilities/TCPInputOutputHandler';
import { createFakeNetSocket } from '@testUtils/fakeNetSocket';
import { buildQuery, buildResponse, QTYPE, ipToRdata } from '@testUtils/dnsPackets';
import type net from 'node:net';
import type dgram from 'node:dgram';

const RINFO: dgram.RemoteInfo = { address: 'unused-for-tcp', port: 0, family: 'IPv4', size: 0 };

describe('TCPInputOutputHandler', () => {
  it('buildSendAnswer writes a 2-byte length-prefixed DNS response', () => {
    const socket = createFakeNetSocket();
    const io = new TCPInputOutputHandler(socket as unknown as net.Socket);

    const result = io.buildSendAnswer(buildQuery('nexoral.local'), RINFO, 'nexoral.local', '10.10.10.10', 60);

    expect(result).toBe(true);
    expect(socket.write).toHaveBeenCalledTimes(1);
    const written = socket.allWritten();
    const declaredLength = written.readUInt16BE(0);
    const payload = written.subarray(2);
    expect(payload.length).toBe(declaredLength);
    expect(io.parseDNSResponse(payload, 'A')).toEqual({
      type: 'A',
      name: 'nexoral.local',
      value: '10.10.10.10',
      ttl: 60,
    });
  });

  it('buildSendAnswer defaults ResponseIP to "0.0.0.0" and ttl to 10', () => {
    const socket = createFakeNetSocket();
    const io = new TCPInputOutputHandler(socket as unknown as net.Socket);

    io.buildSendAnswer(buildQuery('nexoral.local'), RINFO, 'nexoral.local');

    const payload = socket.allWritten().subarray(2);
    expect(io.parseDNSResponse(payload, 'A')).toEqual({
      type: 'A',
      name: 'nexoral.local',
      value: '0.0.0.0',
      ttl: 10,
    });
  });

  it('buildSendAnswer returns false when the socket is already destroyed', () => {
    const socket = createFakeNetSocket({ destroyed: true });
    const io = new TCPInputOutputHandler(socket as unknown as net.Socket);

    expect(io.buildSendAnswer(buildQuery('nexoral.local'), RINFO, 'nexoral.local')).toBe(false);
    expect(socket.write).not.toHaveBeenCalled();
  });

  it('buildSendAnswer returns false when write() throws', () => {
    const socket = createFakeNetSocket();
    socket.write.mockImplementation(() => {
      throw new Error('EPIPE');
    });
    const io = new TCPInputOutputHandler(socket as unknown as net.Socket);
    expect(io.buildSendAnswer(buildQuery('a.com'), RINFO, 'a.com')).toBe(false);
  });

  it('sendRawAnswer writes a length-prefixed raw buffer and returns true', () => {
    const socket = createFakeNetSocket();
    const io = new TCPInputOutputHandler(socket as unknown as net.Socket);
    const raw = buildResponse('a.com', QTYPE.A, 0x1, { type: QTYPE.A, ttl: 30, rdata: ipToRdata('1.2.3.4') });

    expect(io.sendRawAnswer(raw, RINFO)).toBe(true);
    const written = socket.allWritten();
    expect(written.readUInt16BE(0)).toBe(raw.length);
    expect(written.subarray(2)).toEqual(raw);
  });

  it('sendRawAnswer returns false when the socket is destroyed', () => {
    const socket = createFakeNetSocket({ destroyed: true });
    const io = new TCPInputOutputHandler(socket as unknown as net.Socket);
    expect(io.sendRawAnswer(Buffer.from([1, 2, 3]), RINFO)).toBe(false);
  });

  it('getRinfo reflects the underlying socket remote address/port/family', () => {
    const socket = createFakeNetSocket({ remoteAddress: '172.16.0.9', remotePort: 4444, remoteFamily: 'IPv4' });
    const io = new TCPInputOutputHandler(socket as unknown as net.Socket);
    expect(io.getRinfo()).toEqual({ address: '172.16.0.9', family: 'IPv4', port: 4444, size: 0 });
  });

  it('getRinfo maps remoteFamily "IPv6" correctly', () => {
    const socket = createFakeNetSocket({ remoteFamily: 'IPv6', remoteAddress: '::1', remotePort: 9999 });
    const io = new TCPInputOutputHandler(socket as unknown as net.Socket);
    expect(io.getRinfo().family).toBe('IPv6');
  });

  it('getRinfo falls back to "0.0.0.0" / port 0 when remoteAddress/remotePort are undefined', () => {
    const socket = createFakeNetSocket({ remoteAddress: undefined, remotePort: undefined });
    const io = new TCPInputOutputHandler(socket as unknown as net.Socket);
    expect(io.getRinfo()).toEqual({ address: '0.0.0.0', family: 'IPv4', port: 0, size: 0 });
  });

  it('delegates parseQueryName / parseQueryType to DNSPacketCodec', () => {
    const socket = createFakeNetSocket();
    const io = new TCPInputOutputHandler(socket as unknown as net.Socket);
    const query = buildQuery('tcp.example.org', QTYPE.CNAME);
    expect(io.parseQueryName(query)).toBe('tcp.example.org');
    expect(io.parseQueryType(query)).toBe('CNAME');
  });
});
