/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import net from "node:net";
import dgram from "node:dgram";
import { IDNSIOHandler } from "./IDNSIOHandler";
import { DNSPacketCodec } from "./DNSPacketCodec";

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

  constructor(socket: net.Socket) {
    this.tcpSocket = socket;
  }

  public parseQueryName(msg: Buffer, offset = 12): string {
    return DNSPacketCodec.parseQueryName(msg, offset);
  }

  public parseQueryType(msg: Buffer): string {
    return DNSPacketCodec.parseQueryType(msg);
  }

  public parseDNSResponse(
    response: Buffer,
    queryType: string
  ): { type: string; name: string; value: string; ttl: number } | null {
    return DNSPacketCodec.parseDNSResponse(response, queryType);
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
      const payload = DNSPacketCodec.buildResponsePayload(msg, domain, ResponseIP, ttl);
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
    this.tcpSocket.write(Buffer.concat([lengthPrefix, payload]));
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
