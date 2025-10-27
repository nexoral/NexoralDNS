import { Console } from "outers";
import InputOutputHandler from "../../utilities/IO.utls";
import dgram from "dgram";
import { DomainDBPoolService } from "../DB/DB_Pool.service";
import GlobalDNSforwarder from "../Forwarder/GlobalDNSforwarder.service";


export default class StartRulesService {
  private IO: InputOutputHandler;
  private server: dgram.Socket;

  constructor(IP_handler: InputOutputHandler, server: dgram.Socket) {
    this.IO = IP_handler;
    this.server = server;
  }

  public async execute(msg: Buffer<ArrayBufferLike>, rinfo: dgram.RemoteInfo): Promise<void> {
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
  }
}