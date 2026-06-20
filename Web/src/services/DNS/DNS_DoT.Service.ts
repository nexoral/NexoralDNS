import tls from "node:tls";
import net from "node:net";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import dgram from "node:dgram";
import { Console } from "outers";
import StartRulesService from "../Start/Rules.service";
import TCPInputOutputHandler from "../../utilities/TCPInputOutputHandler";
import MongoConnector from "../../Database/mongodb.db";
import getLocalIP from "../../utilities/GetWLANIP.utls";

const CERT_DIR  = process.env.DOT_CERT_DIR ?? "/etc/nexoral/cert";
const CERT_FILE = `${CERT_DIR}/server.crt`;
const KEY_FILE  = `${CERT_DIR}/server.key`;

/**
 * Generates a self-signed TLS certificate using the system's openssl binary
 * (available on all Linux distributions) and returns cert + key as Buffers.
 * Uses temp files to avoid leaving sensitive key material on disk by default.
 */
function generateSelfSigned(): { cert: Buffer; key: Buffer } {
  const base = join(tmpdir(), `nexoral-dot-${Date.now()}`);
  const keyPath  = `${base}.key.pem`;
  const certPath = `${base}.cert.pem`;

  try {
    execFileSync("openssl", [
      "req", "-x509", "-newkey", "rsa:2048",
      "-keyout", keyPath, "-out", certPath,
      "-days", "730", "-nodes",
      "-subj", "/CN=NexoralDNS/O=NexoralDNS",
    ], { stdio: "pipe" }); // suppress openssl's verbose output

    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  } finally {
    try { fs.unlinkSync(keyPath); } catch { /* best-effort cleanup */ }
    try { fs.unlinkSync(certPath); } catch { /* best-effort cleanup */ }
  }
}

/**
 * Returns TLS cert + key from disk if they exist, otherwise auto-generates a
 * self-signed certificate via openssl and persists it for future restarts.
 * If persisting fails (e.g. /etc not writable), the in-memory buffers are used.
 */
function loadOrGenerateCerts(): { cert: Buffer; key: Buffer } {
  if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
    return { cert: fs.readFileSync(CERT_FILE), key: fs.readFileSync(KEY_FILE) };
  }

  Console.yellow("DoT: No TLS certs found — generating self-signed certificate via openssl...");
  const { cert, key } = generateSelfSigned();

  // Persist to disk so the same cert survives restarts (avoids re-trust prompts).
  try {
    fs.mkdirSync(CERT_DIR, { recursive: true });
    fs.writeFileSync(CERT_FILE, cert, { mode: 0o644 });
    fs.writeFileSync(KEY_FILE, key, { mode: 0o600 });
    Console.green(`DoT: Self-signed TLS cert saved to ${CERT_DIR}`);
  } catch {
    Console.yellow("DoT: Cannot persist TLS certs to disk — using in-memory only.");
  }

  return { cert, key };
}

/**
 * DNS over TLS server (port 853, RFC 7858).
 *
 * Mirrors the structure of DNS_TCP.Service with the same chainable API:
 *   new DNS_DoT().start().listen().listenError()
 *
 * Zero-config for LAN use: a self-signed TLS certificate is auto-generated on
 * first startup (via openssl) and cached at DOT_CERT_DIR (default /etc/nexoral/tls).
 * DoT clients must trust the self-signed cert or skip certificate verification,
 * which is the standard expectation for private LAN DNS.
 *
 * Set DOT_CERT_DIR env var to override the certificate storage directory.
 * Existing certs are loaded from disk if CERT_FILE and KEY_FILE are present.
 */
export default class DNS_DoT {
  private server: tls.Server;
  private rulesService: StartRulesService;

  constructor() {
    const { cert, key } = loadOrGenerateCerts();

    this.server = tls.createServer({
      cert,
      key,
      // RFC 7858 §3.1: DoT MUST support TLS 1.2; TLS 1.3 is preferred.
      minVersion: "TLSv1.2",
    });

    this.rulesService = new StartRulesService();
  }

  /**
   * Binds the TLS server to port 853 on all interfaces and connects MongoDB.
   */
  public start(): this {
    this.server.on("listening", () => {
      const addr = this.server.address() as net.AddressInfo;
      Console.green(
        `DNS DoT server running at tls://${addr.address}:${addr.port} with Worker: ${process.pid}`
      );
    });

    MongoConnector().catch((error) => {
      Console.red("DNS_DoT: Failed to connect to MongoDB:", error);
    });

    this.server.listen(853, getLocalIP("any"));
    return this;
  }

  /**
   * Registers the per-connection handler.
   *
   * Uses "secureConnection" which fires only after the TLS handshake completes,
   * giving a fully negotiated tls.TLSSocket. From there, framing and dispatch
   * are identical to DNS_TCP — TCPInputOutputHandler accepts TLSSocket because
   * tls.TLSSocket extends net.Socket.
   */
  public listen(): this {
    this.server.on("secureConnection", (socket: tls.TLSSocket) => {
      const ioHandler = new TCPInputOutputHandler(socket);
      const baseRinfo = ioHandler.getRinfo();

      let recvBuffer = Buffer.alloc(0);

      socket.on("data", async (chunk: Buffer) => {
        recvBuffer = Buffer.concat([recvBuffer, chunk]);

        while (recvBuffer.length >= 2) {
          const msgLen = recvBuffer.readUInt16BE(0);
          if (recvBuffer.length < 2 + msgLen) break;

          const dnsMsg = recvBuffer.subarray(2, 2 + msgLen);
          recvBuffer = recvBuffer.subarray(2 + msgLen);

          const rinfo: dgram.RemoteInfo = { ...baseRinfo, size: msgLen };
          await this.rulesService.execute(dnsMsg, rinfo, ioHandler);
        }
      });

      socket.on("error", (err: Error) => {
        Console.red(`DNS DoT connection error [${baseRinfo.address}]: ${err.message}`);
        socket.destroy();
      });

      socket.on("timeout", () => {
        Console.red(`DNS DoT connection timeout [${baseRinfo.address}]`);
        socket.destroy();
      });

      // RFC 7858 §6.2.1: idle timeout recommendation is 10 seconds minimum.
      socket.setTimeout(30_000);
    });

    return this;
  }

  /**
   * Registers a server-level error handler and closes the server on error.
   */
  public listenError(): this {
    this.server.on("error", (err: Error) => {
      Console.red(`DNS DoT server error:\n${err.stack}`);
      this.server.close();
    });
    return this;
  }

  /**
   * Closes the TLS server and stops accepting new connections.
   */
  public close(): this {
    this.server.close();
    return this;
  }
}
