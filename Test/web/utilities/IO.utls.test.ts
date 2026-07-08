import { describe, it, expect } from 'vitest';
import InputOutputHandler from '@web/utilities/IO.utls';
import { createFakeDgramSocket } from '@testUtils/fakeDgramSocket';
import { buildQuery, buildResponse, QTYPE, ipToRdata } from '@testUtils/dnsPackets';

const RINFO = { address: '10.0.0.7', port: 5353, family: 'IPv4' as const, size: 0 };

describe('InputOutputHandler (UDP)', () => {
  it('buildSendAnswer sends a response and returns true when the socket is bound', () => {
    const socket = createFakeDgramSocket();
    socket.simulateBound('192.168.1.1');
    const io = new InputOutputHandler(socket as unknown as import('node:dgram').Socket);
    const query = buildQuery('nexoral.local');

    const result = io.buildSendAnswer(query, RINFO, 'nexoral.local', '10.10.10.10', 60);

    expect(result).toBe(true);
    expect(socket.send).toHaveBeenCalledTimes(1);
    const [sentBuf, port, address] = socket.send.mock.calls[0];
    expect(port).toBe(RINFO.port);
    expect(address).toBe(RINFO.address);
    expect((sentBuf as Buffer).readUInt16BE(6)).toBe(1); // ANCOUNT = 1
  });

  it('buildSendAnswer returns false without sending when the socket is not running (unbound)', () => {
    const socket = createFakeDgramSocket();
    const io = new InputOutputHandler(socket as unknown as import('node:dgram').Socket);

    expect(io.buildSendAnswer(buildQuery('nexoral.local'), RINFO, 'nexoral.local')).toBe(false);
    expect(socket.send).not.toHaveBeenCalled();
  });

  it('buildSendAnswer returns false when send() throws synchronously', () => {
    const socket = createFakeDgramSocket();
    socket.simulateBound('192.168.1.1');
    socket.send.mockImplementation(() => {
      throw new Error('ENOTCONN');
    });
    const io = new InputOutputHandler(socket as unknown as import('node:dgram').Socket);

    expect(io.buildSendAnswer(buildQuery('nexoral.local'), RINFO, 'nexoral.local')).toBe(false);
  });

  it('defaults ResponseIP to "0.0.0.0" and ttl to 0 when omitted', () => {
    const socket = createFakeDgramSocket();
    socket.simulateBound('192.168.1.1');
    const io = new InputOutputHandler(socket as unknown as import('node:dgram').Socket);

    io.buildSendAnswer(buildQuery('nexoral.local'), RINFO, 'nexoral.local');

    const sentBuf = socket.send.mock.calls[0][0] as Buffer;
    expect(io.parseDNSResponse(sentBuf, 'A')).toEqual({
      type: 'A',
      name: 'nexoral.local',
      value: '0.0.0.0',
      ttl: 0,
    });
  });

  it('sendRawAnswer forwards the raw buffer to the socket and returns true when bound', () => {
    const socket = createFakeDgramSocket();
    socket.simulateBound('192.168.1.1');
    const io = new InputOutputHandler(socket as unknown as import('node:dgram').Socket);
    const raw = buildResponse('a.com', QTYPE.A, 0x1, { type: QTYPE.A, ttl: 30, rdata: ipToRdata('1.2.3.4') });

    expect(io.sendRawAnswer(raw, RINFO)).toBe(true);
    expect(socket.send).toHaveBeenCalledWith(raw, RINFO.port, RINFO.address);
  });

  it('sendRawAnswer returns false when the socket is not running', () => {
    const socket = createFakeDgramSocket();
    const io = new InputOutputHandler(socket as unknown as import('node:dgram').Socket);
    expect(io.sendRawAnswer(Buffer.from([1, 2, 3]), RINFO)).toBe(false);
  });

  it('sendRawAnswer returns false when send() throws', () => {
    const socket = createFakeDgramSocket();
    socket.simulateBound('192.168.1.1');
    socket.send.mockImplementation(() => {
      throw new Error('boom');
    });
    const io = new InputOutputHandler(socket as unknown as import('node:dgram').Socket);
    expect(io.sendRawAnswer(Buffer.from([1, 2, 3]), RINFO)).toBe(false);
  });

  it('delegates parseQueryName / parseQueryType / parseDNSResponse to DNSPacketCodec', () => {
    const socket = createFakeDgramSocket();
    const io = new InputOutputHandler(socket as unknown as import('node:dgram').Socket);
    const query = buildQuery('www.example.org', QTYPE.AAAA);

    expect(io.parseQueryName(query)).toBe('www.example.org');
    expect(io.parseQueryType(query)).toBe('AAAA');

    const response = buildResponse('www.example.org', QTYPE.A, 0x1, {
      type: QTYPE.A,
      ttl: 45,
      rdata: ipToRdata('5.6.7.8'),
    });
    expect(io.parseDNSResponse(response, 'A')).toEqual({
      type: 'A',
      name: 'www.example.org',
      value: '5.6.7.8',
      ttl: 45,
    });
  });
});
