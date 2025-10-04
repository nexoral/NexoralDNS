import dgram from "node:dgram";
import { Console } from "outers"

// Utility to get local IP address
import getLocalIP from "../utilities/GetWLANIP.utls";

// DNS forwarder service
import GlobalDNSforwarder from "./GlobalDNSforwarder.service";

// Input/Output handler for UDP messages
import InputOutputHandler from "../utilities/IO.utls";
import MongoConnector from "../Database/mongodb.db";
import { DomainDBPoolService } from "./DB_Pool.service";


/**
 * DNS class to handle incoming DNS queries and respond accordingly.
 * It listens for DNS requests on a specified port and IP address,
 * responds with a predefined IP for a specific domain, or forwards
 * the request to a global DNS server for other domains.
 */
export default class DNS {
  private server: dgram.Socket;
  private IO: InputOutputHandler;

  constructor() {
    this.server = dgram.createSocket({ type: "udp4", reuseAddr: true }); // Create a UDP socket with address reuse
    this.IO = new InputOutputHandler(this.server);
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
      // Parse query name
      const queryName: string = this.IO.parseQueryName(msg);
      const queryType: string = this.IO.parseQueryType(msg);
      const record = await new DomainDBPoolService().getDnsRecordByDomainName(queryName);
      if (queryName === record?.name) {
        Console.bright(`Responding to ${queryName} (${queryType} Record) with ${record.value} with TTL: ${record.ttl} from database with the help of worker: ${process.pid}`);
        // Use buildSendAnswer method from utilities
        const response = this.IO.buildSendAnswer(msg, rinfo, record.name, record.value, record.ttl);
        if (!response) {
          Console.red(`Failed to respond to ${queryName}`);
        }
      } else {
        // Forward to Global DNS for non-matching domains
        try {
          const forwardedResponse = await GlobalDNSforwarder(msg, queryName, 10); // Set custom TTL to 10 seconds
          if (forwardedResponse) {
            const resp: boolean = this.IO.sendRawAnswer(forwardedResponse, rinfo);
            if (!resp) {
              Console.red(`Failed to forward ${queryName} to Global DNS`);
            }
          }
        } catch (error) {
          Console.red(`Failed to forward ${queryName} to Global DNS:`, error);
        }

        // Use buildSendAnswer with no matching domain (will return empty answer)
        const response = this.IO.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0");
        if (!response) {
          Console.red(`Failed to respond to ${queryName}`);
        }
      }
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