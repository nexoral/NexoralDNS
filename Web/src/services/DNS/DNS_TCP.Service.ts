import net from "node:net";
import dgram from "node:dgram";
import { Console } from "outers";
import StartRulesService from "../Start/Rules.service";
import TCPInputOutputHandler from "../../utilities/TCPInputOutputHandler";
import MongoConnector from "../../Database/mongodb.db";
import getLocalIP from "../../utilities/GetWLANIP.utls";

/**
 * DNS over TCP server (port 53, RFC 1035 §4.2.2 / RFC 7766).
 *
 * Mirrors the structure of DNS.Service (UDP) with the same chainable API:
 *   new DNS_TCP().start().listen().listenError()
 *
 * Each accepted connection gets its own TCPInputOutputHandler and StartRulesService
 * so the correct socket is always captured. The 7-layer processing logic is fully
 * reused via StartRulesService.execute() without modification.
 */
export default class DNS_TCP {
  private server: net.Server;
  private rulesService: StartRulesService;

  constructor() {
    this.server = net.createServer({ allowHalfOpen: false });
    this.rulesService = new StartRulesService();
  }

  /**
   * Binds the TCP server to port 53 on all interfaces and connects MongoDB.
   */
  public start(): this {
    this.server.on("listening", () => {
      const addr = this.server.address() as net.AddressInfo;
      Console.green(
        `DNS TCP server running at tcp://${addr.address}:${addr.port} with Worker: ${process.pid}`
      );
    });

    MongoConnector().catch((error) => {
      Console.red("DNS_TCP: Failed to connect to MongoDB:", error);
    });

    // Bind to the same LAN interface as the UDP service to avoid conflicting
    // with systemd-resolved which holds TCP port 53 on 127.0.0.53.
    // TCP:53 and UDP:53 on the same IP are separate kernel sockets and coexist.
    this.server.listen(53, getLocalIP("any"));
    return this;
  }

  /**
   * Registers the per-connection handler.
   *
   * TCP DNS framing (RFC 1035 §4.2.2): each message is prefixed with a 2-byte
   * big-endian length. Data events are buffered until a complete DNS message is
   * assembled, then dispatched to StartRulesService.execute().
   */
  public listen(): this {
    this.server.on("connection", (socket: net.Socket) => {
      const ioHandler = new TCPInputOutputHandler(socket);
      const baseRinfo = ioHandler.getRinfo();

      let recvBuffer = Buffer.alloc(0);

      socket.on("data", async (chunk: Buffer) => {
        recvBuffer = Buffer.concat([recvBuffer, chunk]);

        while (recvBuffer.length >= 2) {
          const msgLen = recvBuffer.readUInt16BE(0);
          if (recvBuffer.length < 2 + msgLen) break; // Wait for the full message

          const dnsMsg = recvBuffer.subarray(2, 2 + msgLen);
          recvBuffer = recvBuffer.subarray(2 + msgLen);

          const rinfo: dgram.RemoteInfo = { ...baseRinfo, size: msgLen };
          await this.rulesService.execute(dnsMsg, rinfo, ioHandler);
        }
      });

      socket.on("error", (err: Error) => {
        Console.red(`DNS TCP connection error [${baseRinfo.address}]: ${err.message}`);
        socket.destroy();
      });

      socket.on("timeout", () => {
        Console.red(`DNS TCP connection timeout [${baseRinfo.address}]`);
        socket.destroy();
      });

      // RFC 7766 §6.2.3: implementations SHOULD use idle timeouts.
      socket.setTimeout(30_000);
    });

    return this;
  }

  /**
   * Registers a server-level error handler and closes the server on error.
   */
  public listenError(): this {
    this.server.on("error", (err: Error) => {
      Console.red(`DNS TCP server error:\n${err.stack}`);
      this.server.close();
    });
    return this;
  }

  /**
   * Closes the TCP server and stops accepting new connections.
   */
  public close(): this {
    this.server.close();
    return this;
  }
}
