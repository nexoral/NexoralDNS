import dgram from "node:dgram";
import { Console } from "outers"
import StartRulesService from "../Start/Rules.service";

// Utility to get local IP address
import getLocalIP from "../../utilities/GetWLANIP.utls";
import IP_SCAN from "../../utilities/AutoIP_SCAN.utls";

// Input/Output handler for UDP messages
import InputOutputHandler from "../../utilities/IO.utls";
import MongoConnector from "../../Database/mongodb.db";


/**
 * DNS class to handle incoming DNS queries and respond accordingly.
 * It listens for DNS requests on a specified port and IP address,
 * responds with a predefined IP for a specific domain, or forwards
 * the request to a global DNS server for other domains.
 */
export default class DNS {
  private server: dgram.Socket;
  private IO: InputOutputHandler;
  private startRulesService : StartRulesService;

  constructor() {
    this.server = dgram.createSocket({ type: "udp4", reuseAddr: true }); // Create a UDP socket with address reuse
    this.IO = new InputOutputHandler(this.server);
    this.startRulesService = new StartRulesService(this.IO, this.server);
  }

  /**
   * Starts the DNS server and binds it to the specified port and local IP address.
   * 
   * - Listens for the "listening" event and logs the server address and port.
   * - Binds the server to port 53 (default DNS port) using the local IP address obtained from `getLocalIP("any")`.
   * - Returns the current instance for method chaining.
   *
   * @returns {this} The current instance of the DNS service.
   */
  public start(): this {
    this.server.on("listening", () => {
      const address = this.server.address();
      Console.green(`DNS server running at udp://${address.address}:${address.port} with Worker: ${process.pid}`);
    });

    MongoConnector().catch((error) => {
      Console.red("Failed to connect to MongoDB:", error);
    });

    // Run on 5353 (non-root). Use 53 if root/admin
    this.server.bind(53, getLocalIP("any"));

    // Start IP address scanning with callback to update server reference
    const ipScanner = new IP_SCAN(getLocalIP("any"), this.server, (newSocket) => {
      // Update server reference and re-attach event listeners
      this.server = newSocket;
      this.IO = new InputOutputHandler(this.server);

      // Re-attach event listeners for the new socket
      this.listen();
      this.listenError();

      // Log successful rebinding
      setTimeout(() => {
        const address = this.server.address();
        Console.green(`DNS server successfully rebound to udp://${address.address}:${address.port} with Worker: ${process.pid}`);
      }, 100);
    });
    ipScanner.scan();

    return this;
  }

  /**
   * Starts listening for incoming DNS messages on the server socket.
   * 
   * Parses the DNS query to extract the domain name. If the query matches the configured `DOMAIN`,
   * it responds directly using the `buildSendAnswer` utility method with the specified `GOOGLE_IP`.
   * For non-matching domains, it forwards the query to the global DNS forwarder (`GlobalDNSforwarder`)
   * and sends the raw answer back to the client. If forwarding fails, it logs the error and attempts
   * to respond with an empty answer using `buildSendAnswer`.
   * 
   * All errors encountered during processing or forwarding are logged to the console.
   * 
   * @returns {this} Returns the current instance for chaining.
   */
  public listen(): this {
    this.server.on("message", async (msg, rinfo) => {
      await this.startRulesService.execute(msg, rinfo);
    });
    return this;
  }

  /**
   * Registers an error listener on the DNS server instance.
   * When an error occurs, logs the error stack to the console and closes the server.
   * 
   * @returns {this} Returns the current instance for method chaining.
   */
  public listenError(): this {
    this.server.on("error", (err) => {
      Console.red(`DNS server error:\n${err.stack}`);
      this.server.close();
    });
    return this;
  }

  /**
   * Closes the DNS server instance.
   *
   * This method shuts down the server and releases any resources associated with it.
   * Returns the current instance for method chaining.
   *
   * @returns {this} The current instance of the service.
   */
  public close(): this {
    this.server.close();
    return this;
  }
}