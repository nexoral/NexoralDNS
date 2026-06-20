/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import net from "node:net";
import dgram from "node:dgram";
import { IDNSIOHandler } from "./IDNSIOHandler";
import InputOutputHandler from "./IO.utls";

/**
 * TCP/TLS variant of the DNS IO handler (RFC 1035 §4.2.2).
 *
 * One instance is created per accepted TCP connection. All parsing is delegated
 * to InputOutputHandler (pure Buffer operations, no socket required). Responses
 * are written to the TCP socket with a 2-byte big-endian length prefix.
 *
 * Works transparently with tls.TLSSocket since it extends net.Socket.
 */
export default class TCPInputOutputHandler implements IDNSIOHandler {
  private readonly tcpSocket: net.Socket;
  // Used only for pure Buffer parsing — the null socket is never accessed
  // during parsing (same pattern as GlobalDNSforwarder.service.ts).
  private readonly parser: InputOutputHandler;

  constructor(socket: net.Socket) {
    this.tcpSocket = socket;
    this.parser = new InputOutputHandler(null as any);
  }

  // ── Pure parsing — delegate to shared parser ─────────────────────────────

  public parseQueryName(msg: Buffer, offset = 12): string {
    return this.parser.parseQueryName(msg, offset);
  }

  public parseQueryType(msg: Buffer): string {
    return this.parser.parseQueryType(msg);
  }

  public parseDNSResponse(
    response: Buffer,
    queryType: string
  ): { type: string; name: string; value: string; ttl: number } | null {
    return this.parser.parseDNSResponse(response, queryType);
  }

  // ── Send methods — TCP socket with 2-byte length prefix ──────────────────

  public buildSendAnswer(
    msg: Buffer,
    _rinfo: dgram.RemoteInfo,
    domain: string,
    ResponseIP: string = "0.0.0.0",
    ttl: number = 10
  ): boolean {
    try {
      if (this.tcpSocket.destroyed) return false;
      const payload = this.buildDNSResponsePayload(msg, domain, ResponseIP, ttl);
      this.writeWithLengthPrefix(payload);
      return true;
    } catch {
      return false;
    }
  }

  public sendRawAnswer(msg: Buffer, _rinfo: dgram.RemoteInfo): boolean {
    try {
      if (this.tcpSocket.destroyed) return false;
      this.writeWithLengthPrefix(msg);
      return true;
    } catch {
      return false;
    }
  }

  // ── TCP framing (RFC 1035 §4.2.2) ────────────────────────────────────────

  private writeWithLengthPrefix(payload: Buffer): void {
    const lengthPrefix = Buffer.allocUnsafe(2);
    lengthPrefix.writeUInt16BE(payload.length, 0);
    // Concat into a single write to keep length + payload in one TCP segment.
    this.tcpSocket.write(Buffer.concat([lengthPrefix, payload]));
  }

  /**
   * Mirrors the DNS response packet construction in InputOutputHandler.buildSendAnswer
   * but returns a Buffer instead of calling udpInstance.send(), so it can be
   * passed to writeWithLengthPrefix for TCP framing.
   */
  private buildDNSResponsePayload(
    msg: Buffer,
    domain: string,
    ResponseIP: string,
    ttl: number
  ): Buffer {
    const transactionId = msg.subarray(0, 2);
    const flags = Buffer.from([0x81, 0x80]);
    const qdcount = Buffer.from([0x00, 0x01]);
    let ancount = Buffer.from([0x00, 0x01]);
    const nscount = Buffer.from([0x00, 0x00]);
    const arcount = Buffer.from([0x00, 0x00]);

    let offset = 12;
    const labels: string[] = [];
    while (msg[offset] !== 0) {
      const length = msg[offset];
      labels.push(msg.subarray(offset + 1, offset + 1 + length).toString());
      offset += length + 1;
    }
    const queryName = labels.join(".");
    const question = msg.subarray(12, offset + 5);

    let answer = Buffer.alloc(0);
    if (queryName === domain) {
      const name = Buffer.from([0xc0, 0x0c]);
      const type = Buffer.from([0x00, 0x01]);
      const cls = Buffer.from([0x00, 0x01]);
      const ttlBuffer = Buffer.alloc(4);
      ttlBuffer.writeUInt32BE(ttl, 0);
      const rdlength = Buffer.from([0x00, 0x04]);
      const rdata = Buffer.from(ResponseIP.split(".").map((o) => parseInt(o)));
      answer = Buffer.concat([name, type, cls, ttlBuffer, rdlength, rdata]);
    } else {
      ancount = Buffer.from([0x00, 0x00]);
    }

    return Buffer.concat([
      transactionId, flags, qdcount, ancount, nscount, arcount, question, answer,
    ]);
  }

  // ── Utility ──────────────────────────────────────────────────────────────

  /**
   * Synthesizes a dgram.RemoteInfo-compatible object from the TCP socket.
   * Call once per connection and reuse — the remote address is stable for the
   * lifetime of the connection.
   */
  public getRinfo(): dgram.RemoteInfo {
    return {
      address: this.tcpSocket.remoteAddress ?? "0.0.0.0",
      family: (this.tcpSocket.remoteFamily === "IPv6" ? "IPv6" : "IPv4") as "IPv4" | "IPv6",
      port: this.tcpSocket.remotePort ?? 0,
      size: 0,
    };
  }
}
