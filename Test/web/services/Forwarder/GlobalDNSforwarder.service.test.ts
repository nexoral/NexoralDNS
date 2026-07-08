import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockContainer } from '@testUtils/mockContainer';
import { FakeDgramSocket } from '@testUtils/fakeDgramSocket';
import { buildQuery, buildResponse, QTYPE, ipToRdata } from '@testUtils/dnsPackets';
import type dgram from 'node:dgram';

const { mockContainer, createSocketMock } = vi.hoisted(() => ({
  mockContainer: { get: vi.fn(), has: vi.fn(), register: vi.fn(), clear: vi.fn() },
  createSocketMock: vi.fn(),
}));

vi.mock('node:dgram', () => ({ default: { createSocket: createSocketMock } }));
vi.mock('@web/container/appContainer', () => ({ default: mockContainer }));
vi.mock('@web/utilities/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const RINFO: dgram.RemoteInfo = { address: '10.0.0.42', port: 5353, family: 'IPv4', size: 0 };

async function importFresh() {
  vi.resetModules();
  const sockets: FakeDgramSocket[] = [];
  createSocketMock.mockImplementation(() => {
    const s = new FakeDgramSocket();
    sockets.push(s);
    return s;
  });

  const rabbitMQService = { publish: vi.fn().mockResolvedValue(true) };
  const redisCacheService = { set: vi.fn().mockResolvedValue(undefined) };
  Object.assign(mockContainer, createMockContainer({ RabbitMQService: rabbitMQService, RedisCacheService: redisCacheService }));

  const { GlobalDNSforwarderService } = await import('@web/services/Forwarder/GlobalDNSforwarder.service');
  return { GlobalDNSforwarderService, sockets, rabbitMQService, redisCacheService };
}

/** The first forward() call on a fresh instance always uses socket index 0 (round-robin starts at 0). */
function firstUsedSocket(sockets: FakeDgramSocket[]): FakeDgramSocket {
  return sockets[0];
}

describe('GlobalDNSforwarderService.forward', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a pool of 64 sockets on construction (each unref()d)', async () => {
    const { GlobalDNSforwarderService, sockets } = await importFresh();
    new GlobalDNSforwarderService();
    expect(sockets).toHaveLength(64);
    expect(sockets.every((s) => s.unref.mock.calls.length === 1)).toBe(true);
  });

  it('resolves via the first upstream that responds and restores the client TXID', async () => {
    const { GlobalDNSforwarderService, sockets, redisCacheService } = await importFresh();
    const forwarder = new GlobalDNSforwarderService();
    const socket = firstUsedSocket(sockets);

    const clientQuery = buildQuery('a.com', QTYPE.A, 0xbeef);
    const resultPromise = forwarder.forward(clientQuery, 'a.com', 'A', null, RINFO, performance.now(), false);

    // socket.send() runs synchronously inside the Promise executor before the
    // first await, so the outbound datagram has already gone out by now.
    expect(socket.send).toHaveBeenCalledTimes(1);
    const [outMsg, port, address] = socket.send.mock.calls[0];
    expect(port).toBe(53);
    const generatedTxid = (outMsg as Buffer).readUInt16BE(0);
    expect(generatedTxid).not.toBe(0xbeef); // uses a generated TXID, not the client's

    const upstreamResponse = buildResponse('a.com', QTYPE.A, generatedTxid, {
      type: QTYPE.A,
      ttl: 300,
      rdata: ipToRdata('93.184.216.34'),
    });
    socket.emit('message', upstreamResponse, { address, port: 53, family: 'IPv4', size: upstreamResponse.length });

    const result = await resultPromise;
    expect(result).not.toBeNull();
    expect((result as Buffer).readUInt16BE(0)).toBe(0xbeef); // client's original TXID restored
    expect(redisCacheService.set).toHaveBeenCalledWith(
      'Domain_DNS_Record:a.com',
      expect.objectContaining({ value: '93.184.216.34' }),
      300
    );
  });

  it('ignores a message from an unexpected remote address (TXID collision across servers)', async () => {
    const { GlobalDNSforwarderService, sockets } = await importFresh();
    vi.useFakeTimers();
    const forwarder = new GlobalDNSforwarderService();
    const socket = firstUsedSocket(sockets);

    const resultPromise = forwarder.forward(buildQuery('a.com'), 'a.com', 'A', null, RINFO, performance.now(), false);
    const [outMsg] = socket.send.mock.calls[0];
    const txid = (outMsg as Buffer).readUInt16BE(0);

    const spoofed = buildResponse('a.com', QTYPE.A, txid, { type: QTYPE.A, ttl: 10, rdata: ipToRdata('1.1.1.1') });
    socket.emit('message', spoofed, { address: '6.6.6.6', port: 53, family: 'IPv4', size: spoofed.length });

    for (let i = 0; i < 6; i++) await vi.advanceTimersByTimeAsync(2000);
    expect(await resultPromise).toBeNull();
  });

  it('rewrites the TTL on the answer when customTTL is provided', async () => {
    const { GlobalDNSforwarderService, sockets } = await importFresh();
    const forwarder = new GlobalDNSforwarderService();
    const socket = firstUsedSocket(sockets);

    const resultPromise = forwarder.forward(buildQuery('a.com'), 'a.com', 'A', 999, RINFO, performance.now(), false);
    const [outMsg, , address] = socket.send.mock.calls[0];
    const txid = (outMsg as Buffer).readUInt16BE(0);
    const upstreamResponse = buildResponse('a.com', QTYPE.A, txid, { type: QTYPE.A, ttl: 30, rdata: ipToRdata('2.2.2.2') });
    socket.emit('message', upstreamResponse, { address, port: 53, family: 'IPv4', size: upstreamResponse.length });

    const result = (await resultPromise) as Buffer;
    // TTL field is 4 bytes located before RDLENGTH(2)+RDATA(4) at the tail.
    expect(result.readUInt32BE(result.length - 4 - 2 - 4)).toBe(999);
  });

  it('returns null when every upstream server times out', async () => {
    const { GlobalDNSforwarderService } = await importFresh();
    vi.useFakeTimers();
    const forwarder = new GlobalDNSforwarderService();
    const resultPromise = forwarder.forward(buildQuery('never.com'), 'never.com', 'A', null, RINFO, performance.now(), false);
    for (let i = 0; i < 6; i++) await vi.advanceTimersByTimeAsync(2000);
    expect(await resultPromise).toBeNull();
  });

  it('getActiveForwards() reflects in-flight reservations: 0 idle, 1 mid-flight, back to 0 after resolution', async () => {
    const { GlobalDNSforwarderService, sockets } = await importFresh();
    const forwarder = new GlobalDNSforwarderService();
    expect(forwarder.getActiveForwards()).toBe(0);

    const socket = firstUsedSocket(sockets);
    const resultPromise = forwarder.forward(buildQuery('a.com'), 'a.com', 'A', null, RINFO, performance.now(), false);
    // A TXID is reserved on the pool the moment forward() runs (before the reply).
    expect(forwarder.getActiveForwards()).toBe(1);

    const [outMsg, , address] = socket.send.mock.calls[0];
    const txid = (outMsg as Buffer).readUInt16BE(0);
    const response = buildResponse('a.com', QTYPE.A, txid, { type: QTYPE.A, ttl: 30, rdata: ipToRdata('4.4.4.4') });
    socket.emit('message', response, { address, port: 53, family: 'IPv4', size: response.length });
    await resultPromise;

    // The reservation is released in the finally block after resolution.
    expect(forwarder.getActiveForwards()).toBe(0);
  });

  it('publishes fire-and-forget analytics on success (FORWARDED)', async () => {
    const { GlobalDNSforwarderService, sockets, rabbitMQService } = await importFresh();
    const forwarder = new GlobalDNSforwarderService();
    const socket = firstUsedSocket(sockets);

    const resultPromise = forwarder.forward(buildQuery('a.com'), 'a.com', 'A', null, RINFO, performance.now(), false);
    const [outMsg, , address] = socket.send.mock.calls[0];
    const txid = (outMsg as Buffer).readUInt16BE(0);
    const response = buildResponse('a.com', QTYPE.A, txid, { type: QTYPE.A, ttl: 30, rdata: ipToRdata('4.4.4.4') });
    socket.emit('message', response, { address, port: 53, family: 'IPv4', size: response.length });
    await resultPromise;

    expect(rabbitMQService.publish).toHaveBeenCalledWith(
      'DNS_analytics',
      expect.objectContaining({ queryName: 'a.com', Status: 'DNS REQUEST FORWARDED' }),
      { persistent: false, priority: 5 }
    );
  });

  it('labels analytics as FAIL-SAFE when isFailSafe=true', async () => {
    const { GlobalDNSforwarderService, sockets, rabbitMQService } = await importFresh();
    const forwarder = new GlobalDNSforwarderService();
    const socket = firstUsedSocket(sockets);

    const resultPromise = forwarder.forward(buildQuery('a.com'), 'a.com', 'A', null, RINFO, performance.now(), true);
    const [outMsg, , address] = socket.send.mock.calls[0];
    const txid = (outMsg as Buffer).readUInt16BE(0);
    const response = buildResponse('a.com', QTYPE.A, txid, { type: QTYPE.A, ttl: 30, rdata: ipToRdata('4.4.4.4') });
    socket.emit('message', response, { address, port: 53, family: 'IPv4', size: response.length });
    await resultPromise;

    expect(rabbitMQService.publish).toHaveBeenCalledWith(
      'DNS_analytics',
      expect.objectContaining({ Status: 'RESOLVED (FAIL-SAFE)', From: 'FAIL-SAFE BYPASS' }),
      expect.anything()
    );
  });
});

describe('GlobalDNSforwarderService — stats and circuit breaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tracks totals and exposes them via getStatus()/getters', async () => {
    const { GlobalDNSforwarderService, sockets } = await importFresh();
    const forwarder = new GlobalDNSforwarderService();
    const socket = firstUsedSocket(sockets);

    const resultPromise = forwarder.forward(buildQuery('a.com'), 'a.com', 'A', null, RINFO, performance.now(), false);
    const [outMsg, , address] = socket.send.mock.calls[0];
    const txid = (outMsg as Buffer).readUInt16BE(0);
    const response = buildResponse('a.com', QTYPE.A, txid, { type: QTYPE.A, ttl: 30, rdata: ipToRdata('4.4.4.4') });
    socket.emit('message', response, { address, port: 53, family: 'IPv4', size: response.length });
    await resultPromise;

    const status = forwarder.getStatus();
    expect(status.totalAttempted).toBe(1);
    expect(status.totalSucceeded).toBe(1);
    expect(status.successRate).toBe(100);
    expect(status.concurrencyLimit).toBe(64 * 0x10000);
    expect(status.queueDepth).toBe(0);
    expect(forwarder.getConcurrencyLimit()).toBe(64 * 0x10000);
    expect(forwarder.getQueueDepth()).toBe(0);
    expect(forwarder.getTotalForwardsAttempted()).toBe(1);
    expect(forwarder.getTotalForwardsSucceeded()).toBe(1);
  });

  it('successRate is 0 when nothing has been attempted yet', async () => {
    const { GlobalDNSforwarderService } = await importFresh();
    expect(new GlobalDNSforwarderService().getStatus().successRate).toBe(0);
  });

  /**
   * Forcing Math.random() to 0 makes shuffleArray's Fisher-Yates deterministic:
   * the 6-entry GlobalDNS list always shuffles so the first attempt targets
   * 1.0.0.1 and the second targets 8.8.8.8.
   */
  function forceDeterministicShuffle() {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  }

  /**
   * One forward() where the FIRST upstream (1.0.0.1) times out (recording a
   * failure) and the SECOND (8.8.8.8) responds — one 2s timeout per call keeps
   * 1.0.0.1's repeated failures inside its 30s failure window.
   */
  async function failFirstUpstreamOnly(
    forwarder: InstanceType<Awaited<ReturnType<typeof importFresh>>['GlobalDNSforwarderService']>,
    socket: FakeDgramSocket,
    label: string
  ): Promise<void> {
    const p = forwarder.forward(buildQuery(`${label}.com`), `${label}.com`, 'A', null, RINFO, performance.now(), false);
    await vi.advanceTimersByTimeAsync(2000);
    const [outMsg2, , address2] = socket.send.mock.calls[socket.send.mock.calls.length - 1];
    const txid2 = (outMsg2 as Buffer).readUInt16BE(0);
    const response = buildResponse(`${label}.com`, QTYPE.A, txid2, { type: QTYPE.A, ttl: 30, rdata: ipToRdata('9.9.9.9') });
    socket.emit('message', response, { address: address2, port: 53, family: 'IPv4', size: response.length });
    await p;
  }

  it('opens the circuit breaker for one upstream after 5 failures within its 30s window', async () => {
    const { GlobalDNSforwarderService, sockets } = await importFresh();
    forceDeterministicShuffle();
    const forwarder = new GlobalDNSforwarderService();

    for (let call = 0; call < 5; call++) await failFirstUpstreamOnly(forwarder, sockets[call], `q${call}`);

    const status = forwarder.getStatus();
    const b1001 = status.breakers.find((b) => b.ip === '1.0.0.1')!;
    expect(b1001.state).toBe('OPEN');
    expect(b1001.failures).toBe(5);
    const b888 = status.breakers.find((b) => b.ip === '8.8.8.8')!;
    expect(b888.state).toBe('CLOSED');
    expect(b888.failures).toBe(0);
  });

  it('fast-skips an OPEN breaker (no 2s wait) on the next attempt', async () => {
    const { GlobalDNSforwarderService, sockets } = await importFresh();
    forceDeterministicShuffle();
    const forwarder = new GlobalDNSforwarderService();

    for (let call = 0; call < 5; call++) await failFirstUpstreamOnly(forwarder, sockets[call], `q${call}`);
    expect(forwarder.getStatus().breakers.find((b) => b.ip === '1.0.0.1')!.state).toBe('OPEN');

    const socket = sockets[5];
    const p = forwarder.forward(buildQuery('q5.com'), 'q5.com', 'A', null, RINFO, performance.now(), false);
    await vi.advanceTimersByTimeAsync(0);

    expect(socket.send).toHaveBeenCalledTimes(1); // 1.0.0.1 skipped, only 8.8.8.8 attempted
    const [outMsg, , address] = socket.send.mock.calls[0];
    expect(address).toBe('8.8.8.8');
    const txid = (outMsg as Buffer).readUInt16BE(0);
    const response = buildResponse('q5.com', QTYPE.A, txid, { type: QTYPE.A, ttl: 30, rdata: ipToRdata('9.9.9.9') });
    socket.emit('message', response, { address, port: 53, family: 'IPv4', size: response.length });
    expect(await p).not.toBeNull();
  });

  it('a HALF_OPEN probe that succeeds closes the breaker again', async () => {
    const { GlobalDNSforwarderService, sockets } = await importFresh();
    forceDeterministicShuffle();
    const forwarder = new GlobalDNSforwarderService();

    for (let call = 0; call < 5; call++) await failFirstUpstreamOnly(forwarder, sockets[call], `q${call}`);
    expect(forwarder.getStatus().breakers.find((b) => b.ip === '1.0.0.1')!.state).toBe('OPEN');

    await vi.advanceTimersByTimeAsync(30_000); // cooldown: OPEN -> HALF_OPEN

    const socket = sockets[5];
    const p = forwarder.forward(buildQuery('probe.com'), 'probe.com', 'A', null, RINFO, performance.now(), false);
    const [outMsg, , address] = socket.send.mock.calls[0];
    expect(address).toBe('1.0.0.1'); // probe goes to the half-open server
    const txid = (outMsg as Buffer).readUInt16BE(0);
    const response = buildResponse('probe.com', QTYPE.A, txid, { type: QTYPE.A, ttl: 30, rdata: ipToRdata('9.9.9.9') });
    socket.emit('message', response, { address, port: 53, family: 'IPv4', size: response.length });
    await p;

    const breaker = forwarder.getStatus().breakers.find((b) => b.ip === '1.0.0.1')!;
    expect(breaker.state).toBe('CLOSED');
    expect(breaker.failures).toBe(0);
  });
});
