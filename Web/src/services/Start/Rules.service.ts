import { Console } from "outers";
import InputOutputHandler from "../../utilities/IO.utls";
import dgram from "dgram";
import { DomainDBPoolService } from "../DB/DB_Pool.service";
import GlobalDNSforwarder from "../Forwarder/GlobalDNSforwarder.service";

// Rules Services
import ServiceStatusChecker from "./ServiceStatusChecker.service";
import RedisCache from "../../Redis/Redis.cache";
import CacheKeys, { QueueKeys } from "../../Redis/CacheKeys.cache";

// RabbitMQ
import { DNS_QUERY_STATUS_KEYS } from "../../Redis/CacheKeys.cache";
import RabbitMQService from "../../RabbitMQ/Rabbitmq.config";

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

    // Analytics Payload
    const AnalyticsMSgPayload: {
      queryName: string,
      queryType: string,
      timestamp: number,
      SourceIP: string,
      Status: string,
      From: string
    } = {
      queryName: queryName,
      queryType: queryType,
      SourceIP: rinfo.address,
      timestamp: Date.now(),
      Status: "",
      From: ""
    }
    

    // Add Rule Checker
    const serviceStatus: boolean = await new ServiceStatusChecker(this.IO, msg, rinfo).checkServiceStatus(queryName)
    if(!serviceStatus){
      // Add to Analytics
      AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.SERVICE_DOWN;
      AnalyticsMSgPayload.From = DNS_QUERY_STATUS_KEYS.SERVICE_DOWN_FROM;
      RabbitMQService.publish(QueueKeys.DNS_Analytics, AnalyticsMSgPayload, { persistent: true, priority: 10 })

      return;
    }

    Console.bright(`Processing DNS query for ${queryName} (${queryType} Record) from ${rinfo.address}:${rinfo.port} with the help of worker: ${process.pid}`);
    
    // Taking Record From Cache
    let record;
    const RecordFromCache = await RedisCache.get(`${CacheKeys.Domain_DNS_Record}:${queryName}`)
    if (RecordFromCache !== null){
      Console.bright(`Got Response from Cache System`, RecordFromCache)
      record = RecordFromCache;
      AnalyticsMSgPayload.From = DNS_QUERY_STATUS_KEYS.FROM_CACHE;
    }
    else {
      const NewRecordFromDB = await new DomainDBPoolService().getDnsRecordByDomainName(queryName);
      
      if (NewRecordFromDB){
        Console.bright(`Getting Data from DB`, NewRecordFromDB)
        // If Cache Fail then take from MongoDB
        record = NewRecordFromDB;
        AnalyticsMSgPayload.From = DNS_QUERY_STATUS_KEYS.FROM_DB;
  
        // Add the new Document to the Cache with Domain's Default TTL
        RedisCache.set(`${CacheKeys.Domain_DNS_Record}:${queryName}`, NewRecordFromDB, record.ttl)
      }
    }
    
    if (queryName === record?.name) {
      Console.bright(`Responding to ${queryName} (${queryType} Record) with ${record.value} with TTL: ${record.ttl} from database with the help of worker: ${process.pid}`);
      
      // Add to Analytics
      AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.RESOLVED;
      RabbitMQService.publish(QueueKeys.DNS_Analytics, AnalyticsMSgPayload, {persistent: true, priority: 10})
      
      // Use buildSendAnswer method from utilities
      const response = this.IO.buildSendAnswer(msg, rinfo, record.name, record.value, record.ttl);
     
      if (!response) {

        // Add to Analytics
        AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.FAILED;
        RabbitMQService.publish(QueueKeys.DNS_Analytics, AnalyticsMSgPayload, { persistent: true, priority: 10 })

        Console.red(`Failed to respond to ${queryName}`);
      }
    } else {
      // Forward to Global DNS for non-matching domains
      try {
        const forwardedResponse = await GlobalDNSforwarder(msg, queryName, queryType, 10, rinfo); // Set custom TTL to 10 seconds
        if (forwardedResponse) {
          const resp: boolean = this.IO.sendRawAnswer(forwardedResponse, rinfo);
          if (!resp) {         
            // Add to Analytics
            AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.FAILED;
            RabbitMQService.publish(QueueKeys.DNS_Analytics, AnalyticsMSgPayload, { persistent: true, priority: 10 })

            Console.red(`Failed to forward ${queryName} to Global DNS`);
          }
        }
        else {
          // Add to Analytics
          AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.FAILED;
          RabbitMQService.publish(QueueKeys.DNS_Analytics, AnalyticsMSgPayload, { persistent: true, priority: 10 })

          Console.red(`No response received from Global DNS for ${queryName}`);
          this.IO.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", 10);
        }
      } catch (error) {
        // Add to Analytics
        AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.FAILED;
        RabbitMQService.publish(QueueKeys.DNS_Analytics, AnalyticsMSgPayload, { persistent: true, priority: 10 })

        Console.red(`Failed to forward ${queryName} to Global DNS:`, error);
      }
    }
  }
}