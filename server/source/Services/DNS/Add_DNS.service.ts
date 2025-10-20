import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";


// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";

// db connections
import { getCollectionClient } from "../../Database/mongodb.db";
import { ObjectId } from "mongodb";


export default class DnsAddService {
  private readonly fastifyReply: FastifyReply
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  // Add a new DNS record
  public async addDnsRecord(domain: string, name: string, type: string, value: string, ttl: number, user: any): Promise<void> {

    console.log(`[SERVICE] addDnsRecord called for domain: ${domain}, name: ${name}, value: ${value}, user: ${user._id}`);

    // construct Response
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "DNS record added successfully");
    const DomainCollectionClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAINS);
    const DNSCollectionClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);

    // Add domain to the domains collection
    if (!DomainCollectionClient || !DNSCollectionClient) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Database connection error");
      return Responser.send("Currently unable to connect to database");
    }

    const existingDomain = await DomainCollectionClient.find({ domain: domain, userId: new ObjectId(user._id) }).toArray();
    const existingValue = await DNSCollectionClient.find({ value: value }).toArray();

    console.log(`[SERVICE] Existing domain check: ${existingDomain.length}, Existing value check: ${existingValue.length}`);

    if (existingValue.length > 0) {
      Responser.setStatusCode(StatusCodes.CONFLICT);
      Responser.setMessage("Value already in use");
      return Responser.send("Value already in use by another domain");
    } else if (existingDomain.length === 0) {
      Responser.setStatusCode(StatusCodes.NOT_FOUND);
      Responser.setMessage("Domain not found");
      return Responser.send("Domain not found");
    }
    else {
      console.log(`[SERVICE] Inserting new DNS record: ${name} for domain ${domain}`);

      // Add default DNS records for the new domain
      const dnsRecords = [
        {
          domainId: existingDomain[0]._id,
          type: type,
          name: name,
          value: value,
          ttl: 300,
        }
      ];

      const dnsInsertResult = await DNSCollectionClient.insertMany(dnsRecords);

      console.log(`[SERVICE] DNS record insert result: ${dnsInsertResult.acknowledged}, IDs: ${JSON.stringify(dnsInsertResult.insertedIds)}`);

      if (!dnsInsertResult.acknowledged) {
        Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
        Responser.setMessage("Failed to add DNS records");
        return Responser.send("Failed to add DNS records");
      }

      return Responser.send({ domainId: existingDomain[0]._id, dnsRecordIds: dnsInsertResult.insertedIds });
    }

  }
}