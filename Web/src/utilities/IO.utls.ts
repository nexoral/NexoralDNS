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
  }

  /**
   * Sends a raw DNS answer message to the specified remote client using UDP.
   *
   * @param msg - The DNS answer message as a Buffer.
   * @param rinfo - The remote client's information, including port and address.
   * @returns `true` if the message was sent.
   */
  public sendRawAnswer(msg: Buffer, rinfo: dgram.RemoteInfo): boolean {
    this.udpInstance.send(msg, rinfo.port, rinfo.address);
    return true;
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
  public parseQueryName(msg: Buffer): string {
    let offset = 12;
    const labels: string[] = [];
    while (msg[offset] !== 0) {
      const length = msg[offset];
      labels.push(msg.subarray(offset + 1, offset + 1 + length).toString());
      offset += length + 1;
    }
    return labels.join(".");
  }
}