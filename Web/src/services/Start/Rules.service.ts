import { Console } from "outers";
import InputOutputHandler from "../../utilities/IO.utls";
import dgram from "dgram";
import { DomainDBPoolService } from "../DB/DB_Pool.service";
import GlobalDNSforwarder from "../Forwarder/GlobalDNSforwarder.service";

// Rules Services
import ServiceStatusChecker from "./ServiceStatusChecker.service";
import RedisCache from "../../Redis/Redis.cache";
import CacheKeys from "../../Redis/CacheKeys.cache";

export default class StartRulesService {
  private IO: InputOutputHandler;
  private server: dgram.Socket;

  constructor(IP_handler: InputOutputHandler, server: dgram.Socket) {
    this.IO = IP_handler;
    this.server = server;
  }

  public async execute(msg: Buffer<ArrayBufferLike>, rinfo: dgram.RemoteInfo): Promise<void| boolean> {
    if (!msg || !rinfo) {
      Console.red("Invalid message or remote info received.");
      return;
    }

    // Parse query name
    const queryName: string = this.IO.parseQueryName(msg);
    const queryType: string = this.IO.parseQueryType(msg);

    // Add Rule Checker
    const serviceStatus: boolean = await new ServiceStatusChecker(this.IO, msg, rinfo).checkServiceStatus(queryName)
    if(!serviceStatus){
      return;
    }

    Console.bright(`Processing DNS query for ${queryName} (${queryType} Record) from ${rinfo.address}:${rinfo.port} with the help of worker: ${process.pid}`);
    
    // Taking Record From Cache
    let record;
    const RecordFromCache = await RedisCache.get(`${CacheKeys.Domain_DNS_Record}:${queryName}`)
    if (RecordFromCache === null){
      record = RecordFromCache;
    }
    else {
      const NewRecordFromDB = await new DomainDBPoolService().getDnsRecordByDomainName(queryName);

      if (NewRecordFromDB){
        // If Cache Fail then take from MongoDB
        record = NewRecordFromDB;
  
        // Add the new Document to the Cache with Domain's Default TTL
        RedisCache.set(`${CacheKeys.Domain_DNS_Record}:${queryName}`, NewRecordFromDB, record.ttl)
      }
    }
    
    if (record && queryName === record?.name) {
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
        else {
          Console.red(`No response received from Global DNS for ${queryName}`);
          this.IO.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", 10);
        }
      } catch (error) {
        Console.red(`Failed to forward ${queryName} to Global DNS:`, error);
        this.IO.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", 10);
      }
    }
  }
}