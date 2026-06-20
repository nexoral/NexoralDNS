import dgram from "node:dgram";

/**
 * Common IO contract for DNS handlers (UDP and TCP/TLS variants).
 * Both InputOutputHandler and TCPInputOutputHandler implement this interface,
 * allowing StartRulesService and ServiceStatusChecker to work with either
 * transport without modification.
 */
export interface IDNSIOHandler {
  parseQueryName(msg: Buffer, offset?: number): string;
  parseQueryType(msg: Buffer): string;
  parseDNSResponse(
    response: Buffer,
    queryType: string
  ): { type: string; name: string; value: string; ttl: number } | null;
  buildSendAnswer(
    msg: Buffer,
    rinfo: dgram.RemoteInfo,
    domain: string,
    ResponseIP?: string,
    ttl?: number
  ): boolean;
  sendRawAnswer(msg: Buffer, rinfo: dgram.RemoteInfo): boolean;
}
