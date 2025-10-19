import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";


// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";
// db connections
import { getCollectionClient } from "../../Database/mongodb.db";
import { ObjectId } from "mongodb";


export default class DomainAddService {
  private readonly fastifyReply: FastifyReply
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  // Add a new domain record
  public async addDomain(domain: string, type: string, IpAddress: string, user: any): Promise<void> {

    console.log(`[SERVICE] addDomain called for domain: ${domain}, IP: ${IpAddress}, user: ${user._id}`);

    // construct Response
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Domain added successfully");
    const DomainCollectionClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAINS);
    const DNSCollectionClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);

    // Add domain to the domains collection
    if (!DomainCollectionClient || !DNSCollectionClient) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Database connection error");
      return Responser.send("Currently unable to connect to database");
    }

    const existingDomain = await DomainCollectionClient.find({ domain: domain, userId: new ObjectId(user._id) }).toArray();
    const existingIP = await DNSCollectionClient.find({ value: IpAddress }).toArray();

    console.log(`[SERVICE] Existing domain check: ${existingDomain.length}, Existing IP check: ${existingIP.length}`);

    if (existingIP.length > 0) {
      Responser.setStatusCode(StatusCodes.CONFLICT);
      Responser.setMessage("IP Address already in use");
      return Responser.send("IP Address already in use by another domain");
    } else if (existingDomain.length > 0) {
      Responser.setStatusCode(StatusCodes.CONFLICT);
      Responser.setMessage("Domain already exists");
      return Responser.send("Domain already exists");
    }
    else {
      console.log(`[SERVICE] Inserting new domain: ${domain}`);

      const domainDoc = {
        domain: domain,
        domainStatus: "active",
        userId: new ObjectId(user._id),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const insertResult = await DomainCollectionClient.insertOne(domainDoc);

      console.log(`[SERVICE] Domain insert result: ${insertResult.acknowledged}, ID: ${insertResult.insertedId}`);

      if (!insertResult.acknowledged) {
        Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
        Responser.setMessage("Failed to add domain");
        return Responser.send("Failed to add domain");
      }

      // Add default DNS records for the new domain
      const dnsRecords = [
        {
          domainId: insertResult.insertedId,
          type: type,
          name: domain,
          value: IpAddress,
          ttl: 300,
        }
      ];

      const dnsInsertResult = await DNSCollectionClient.insertMany(dnsRecords);

      console.log(`[SERVICE] DNS records insert result: ${dnsInsertResult.acknowledged}`);

      if (!dnsInsertResult.acknowledged) {
        Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
        Responser.setMessage("Failed to add DNS records");
        return Responser.send("Failed to add DNS records");
      }

      return Responser.send({ domainId: insertResult.insertedId, dnsRecordIds: dnsInsertResult.insertedIds });
    }

  }
}