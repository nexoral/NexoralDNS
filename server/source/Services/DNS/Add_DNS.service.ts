import logger from '../../utilities/logger';
import container from '../../container/appContainer';
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";


// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { RedisCacheService } from "../../Redis/Redis.cache";
import { CacheKeys } from "nexoraldns-shared";

// db connections
import { ObjectId } from "mongodb";


export default class DnsAddService {
  constructor() { }

  // Add a new DNS record
  public async addDnsRecord(domain: string, name: string, type: string, value: string, ttl: number, user: any, reply: FastifyReply): Promise<void> {

    logger.info(`[SERVICE] addDnsRecord called for domain: ${domain}, name: ${name}, value: ${value}, user: ${user._id}`);

    // construct Response
    const Responser = new BuildResponse(reply, StatusCodes.OK, "DNS record added successfully");
    const DomainCollectionClient = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.DOMAINS);
    const DNSCollectionClient = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);

    // Add domain to the domains collection
    if (!DomainCollectionClient || !DNSCollectionClient) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Database connection error");
      return Responser.send("Currently unable to connect to database");
    }

    const existingDomain = await DomainCollectionClient.findOne({ domain: domain, userId: new ObjectId(user._id) });
    const existingValue = await DNSCollectionClient.find({ value: value }).toArray();

    logger.info(`[SERVICE] Existing domain check: ${existingDomain ? 1 : 0}, Existing value check: ${existingValue.length}`);

    if (existingValue.length > 0) {
      Responser.setStatusCode(StatusCodes.CONFLICT);
      Responser.setMessage("Value already in use");
      return Responser.send("Value already in use by another domain");
    } else if (!existingDomain) {
      Responser.setStatusCode(StatusCodes.NOT_FOUND);
      Responser.setMessage("Domain not found");
      return Responser.send("Domain not found");
    }
    else {
      logger.info(`[SERVICE] Inserting new DNS record: ${name} for domain ${domain} type ${type}`);

      const dnsRecords = [];
      if (type == "CNAME") {
        dnsRecords.push({
          domainId: existingDomain._id,
          type: type,
          name: `${name}.${value}`,
          value: value,
          ttl: ttl,
          createdAt: Date.now()
        })
      }
      else {
        // Add other Records than CNAME
        dnsRecords.push(
          {
            domainId: existingDomain._id,
            type: type,
            name: name,
            value: value,
            ttl: ttl,
            createdAt: Date.now()
          })

      }

      const dnsInsertResult = await DNSCollectionClient.insertMany(dnsRecords);

      logger.info(`[SERVICE] DNS record insert result: ${dnsInsertResult.acknowledged}, IDs: ${JSON.stringify(dnsInsertResult.insertedIds)}`);

      if (dnsInsertResult.insertedCount == 0) {
        Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
        Responser.setMessage("Failed to add DNS records");
        return Responser.send("Failed to add DNS records");
      }

      // Invalidate any stale engine cache for this record name (engine keys by name).
      // Covers the case where the name was previously queried and negatively cached.
      await container.get<RedisCacheService>('RedisCacheService').delete(`${CacheKeys.Domain_DNS_Record}:${dnsRecords[0].name}`);

      return Responser.send({ domainId: existingDomain._id, dnsRecordIds: dnsInsertResult.insertedIds });
    }

  }
}