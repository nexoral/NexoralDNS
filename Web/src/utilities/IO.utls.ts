/* eslint-disable @typescript-eslint/no-unused-vars */
import dgram from 'dgram';
import { IDNSIOHandler } from './IDNSIOHandler';
import { DNSPacketCodec } from './DNSPacketCodec';


/**
 * InputOutputHandler class to manage UDP DNS message handling.
 * This class provides methods to build and send DNS answer packets
 * in response to incoming DNS queries, as well as to send raw DNS messages.
 */
export default class InputOutputHandler implements IDNSIOHandler {
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
      if (!this.isSocketRunning()) {
        return false;
      }

      const response = DNSPacketCodec.buildResponsePayload(msg, domain, ResponseIP, ttl);
      this.udpInstance.send(response, rinfo.port, rinfo.address);
      return true;
    } catch (error) {
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
    return DNSPacketCodec.parseQueryName(msg, offset);
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
    return DNSPacketCodec.parseQueryType(msg);
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
    return DNSPacketCodec.parseDNSResponse(response, queryType);
  }
}