/* eslint-disable @typescript-eslint/no-unused-vars */
import dgram from 'dgram';

/**
 * InputOutputHandler class to manage UDP DNS message handling.
 * This class provides methods to build and send DNS answer packets
 * in response to incoming DNS queries, as well as to send raw DNS messages.
 */
export default class InputOutputHandler {
  private readonly udpInstance: dgram.Socket;

  constructor(udpInstance: dgram.Socket) {
    this.udpInstance = udpInstance;
  }

  /**
   * Checks if the UDP socket is currently running and ready to send messages.
   *
   * @returns `true` if the socket is running, `false` otherwise.
   */
  private isSocketRunning(): boolean {
    try {
      // Check if socket has been closed or destroyed by attempting to get its address
      // If the socket is closed, this will throw an error
      const address = this.udpInstance.address();
      return !!address && this.udpInstance !== null && this.udpInstance !== undefined;
    } catch {
      // Socket is closed or not bound
      return false;
    }
  }

  /**
   * Builds and sends a DNS answer packet in response to a DNS query.
   *
   * This method parses the incoming DNS query message, constructs a DNS response packet,
   * and sends it via UDP to the requester. If the queried domain matches the provided domain,
   * an A record answer is included with the specified response IP address. Otherwise, no answer is sent.
   *
   * @param msg - The incoming DNS query message as a Buffer.
   * @param rinfo - Remote information about the UDP sender, including address and port.
   * @param domain - The domain name to match against the DNS query.
   * @param ResponseIP - The IPv4 address to return in the answer (defaults to "8.8.8.8").
   * @param ttl - The time-to-live value in seconds for the DNS record (defaults to 10 seconds).
   * @returns `true` if the response was constructed and sent.
   */
  public buildSendAnswer(
    msg: Buffer,
    rinfo: dgram.RemoteInfo,
    domain: string,
    ResponseIP: string = "0.0.0.0",
    ttl: number = 10
  ): boolean {
    try {
      // Check if socket is still running before attempting to send
      if (!this.isSocketRunning()) {
        return false;
      }

      // Transaction ID (first 2 bytes)
      const transactionId = msg.subarray(0, 2);

      // DNS header flags (response, recursion available, no error)
      const flags = Buffer.from([0x81, 0x80]);
      const qdcount = Buffer.from([0x00, 0x01]); // questions = 1
      let ancount = Buffer.from([0x00, 0x01]); // answers = 1 by default
      const nscount = Buffer.from([0x00, 0x00]);
      const arcount = Buffer.from([0x00, 0x00]);

      // Parse query name
      let offset = 12;
      const labels: string[] = [];
      while (msg[offset] !== 0) {
        const length = msg[offset];
        labels.push(msg.subarray(offset + 1, offset + 1 + length).toString());
        offset += length + 1;
      }
      const queryName = labels.join(".");
      const question = msg.subarray(12, offset + 5); // QNAME + QTYPE + QCLASS

      // Build answer
      let answer = Buffer.alloc(0);
      if (queryName === domain) {
        // Name pointer (0xc00c = pointer to offset 12 where QNAME starts)
        const name = Buffer.from([0xc0, 0x0c]);
        const type = Buffer.from([0x00, 0x01]); // A record
        const cls = Buffer.from([0x00, 0x01]); // IN class
        const ttlBuffer = Buffer.alloc(4);
        ttlBuffer.writeUInt32BE(ttl, 0);
        const rdlength = Buffer.from([0x00, 0x04]); // IPv4 = 4 bytes
        const rdata = Buffer.from(ResponseIP.split(".").map((octet) => parseInt(octet)));
        answer = Buffer.concat([name, type, cls, ttlBuffer, rdlength, rdata]);
      } else {
        // No answer if domain doesn't match
        ancount = Buffer.from([0x00, 0x00]);
      }

      // Construct DNS response
      const response = Buffer.concat([
        transactionId,
        flags,
        qdcount,
        ancount,
        nscount,
        arcount,
        question,
        answer,
      ]);

      this.udpInstance.send(response, rinfo.port, rinfo.address);
      return true;
    } catch (error) {
      // Socket might have been closed during send operation
      return false;
    }
  }

  /**
   * Sends a raw DNS answer message to the specified remote client using UDP.
   *
   * @param msg - The DNS answer message as a Buffer.
   * @param rinfo - The remote client's information, including port and address.
   * @returns `true` if the message was sent, `false` if socket is not running.
   */
  public sendRawAnswer(msg: Buffer, rinfo: dgram.RemoteInfo): boolean {
    try {
      // Check if socket is still running before attempting to send
      if (!this.isSocketRunning()) {
        return false;
      }
      this.udpInstance.send(msg, rinfo.port, rinfo.address);
      return true;
    } catch (error) {
      // Socket might have been closed during send operation
      return false;
    }
  }

  /**
   * Parses the DNS query name from a DNS message buffer.
   *
   * The function starts reading at offset 12, which is the beginning of the question section
   * in a standard DNS message. It extracts each label of the domain name until it encounters
   * a zero byte, indicating the end of the name. The labels are then joined with dots to form
   * the full domain name.
   *
   * @param msg - The DNS message buffer to parse.
   * @returns The parsed domain name as a string.
   */
  public parseQueryName(msg: Buffer, offset = 12): string {
    const labels: string[] = [];
    let jumped = false;
    let jumpOffset = 0;

    while (true) {
      const length = msg[offset];

      // End of name
      if (length === 0) {
        if (!jumped) offset++;
        break;
      }

      // Compression pointer
      if ((length & 0xC0) === 0xC0) {
        if (!jumped) jumpOffset = offset + 2;
        offset = ((length & 0x3F) << 8) | msg[offset + 1];
        jumped = true;
        continue;
      }

      // Normal label
      labels.push(msg.subarray(offset + 1, offset + 1 + length).toString());
      offset += length + 1;
    }

    return labels.join(".");
  }

  /**
   * Parses the query type from a DNS message buffer.
   *
   * This method extracts the QTYPE field from a DNS message by:
   * 1. Skipping the header (12 bytes)
   * 2. Navigating through the QNAME field (domain name with length prefixes)
   * 3. Reading the 16-bit QTYPE value
   *
   * @param msg - A Buffer containing the DNS message to parse
   * @returns A string representation of the query type (e.g., "A", "NS", "CNAME", etc.)
   *          or "Unknown (qtype)" for unrecognized types
   */
  public parseQueryType(msg: Buffer): string {
    let offset = 12;
    while (msg[offset] !== 0) {
      const length = msg[offset];
      offset += length + 1;
    }
    // Move past the null byte at the end of the QNAME
    offset += 1;
    const qtype = msg.readUInt16BE(offset);
    switch (qtype) {
      case 1:
        return "A";
      case 2:
        return "NS";
      case 5:
        return "CNAME";
      case 6:
        return "SOA";
      case 12:
        return "PTR";
      case 15:
        return "MX";
      case 16:
        return "TXT";
      case 28:
        return "AAAA";
      default:
        return `Unknown (${qtype})`;
    }
  }

  /**
   * Parses DNS response to extract record information for caching.
   *
   * This method extracts the first answer record from a DNS response including:
   * - Record type (A, AAAA, etc.)
   * - Domain name
   * - Record value (IP address)
   * - TTL (Time To Live)
   *
   * @param response - The DNS response buffer.
   * @param queryType - The query type string (A, AAAA, etc.).
   * @returns Parsed DNS record object or null if parsing fails or no answers exist.
   */
  public parseDNSResponse(response: Buffer, queryType: string): { type: string; name: string; value: string; ttl: number } | null {
    try {
      let offset = 12;

      // Skip question section
      const qdcount = response.readUInt16BE(4);
      for (let i = 0; i < qdcount; i++) {
        while (offset < response.length && response[offset] !== 0) {
          if ((response[offset] & 0xC0) === 0xC0) {
            offset += 2;
            break;
          }
          offset += response[offset] + 1;
        }
        if (response[offset] === 0) offset++;
        offset += 4; // Skip QTYPE and QCLASS
      }

      // Check if there are answers
      const ancount = response.readUInt16BE(6);
      if (ancount === 0) return null;

      // Parse answer section - extract domain name
      const name = this.parseQueryName(response, offset);

      // Skip name field
      if ((response[offset] & 0xC0) === 0xC0) {
        offset += 2;
      } else {
        while (offset < response.length && response[offset] !== 0) {
          offset += response[offset] + 1;
        }
        offset++;
      }

      // Read TYPE and CLASS
      const type = response.readUInt16BE(offset);
      offset += 4; // Skip TYPE and CLASS

      // Read TTL
      const ttl = response.readUInt32BE(offset);
      offset += 4;

      // Read RDLENGTH
      const rdlength = response.readUInt16BE(offset);
      offset += 2;

      // Extract value based on type
      let value = "";
      if (type === 1 && rdlength === 4) { // A record
        value = `${response[offset]}.${response[offset + 1]}.${response[offset + 2]}.${response[offset + 3]}`;
      } else if (type === 28 && rdlength === 16) { // AAAA record
        const parts = [];
        for (let i = 0; i < 8; i++) {
          parts.push(response.readUInt16BE(offset + i * 2).toString(16));
        }
        value = parts.join(":");
      }

      if (!value) return null;

      return {
        type: queryType,
        name: name,
        value: value,
        ttl: ttl
      };
    } catch (error) {
      return null;
    }
  }
}