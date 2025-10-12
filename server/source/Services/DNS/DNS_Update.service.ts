import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";


// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";

// db connections
import { getCollectionClient } from "../../Database/mongodb.db";
import { ObjectId } from "mongodb";


export default class DnsUpdateService {
  private readonly fastifyReply: FastifyReply
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  // Update a DNS record
  public async updateDnsRecord(id: string, name: string, type: string, value: string, ttl: number, user: any): Promise<void> {

    // construct Response
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "DNS record updated successfully");
    const DomainCollectionClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAINS);
    const DNSCollectionClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);

    // Add domain to the domains collection
    if (!DomainCollectionClient || !DNSCollectionClient) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Database connection error");
      return Responser.send("Currently unable to connect to database");
    }

    const existingDNS = await DNSCollectionClient.find({ _id: new ObjectId(id) }).toArray();
    const existingName = await DNSCollectionClient.find({ name: name }).toArray();
    const existingValue = await DNSCollectionClient.find({ value: value }).toArray();

    
    if (existingName.length > 0) {
      Responser.setStatusCode(StatusCodes.CONFLICT);
      Responser.setMessage("Name already in use");
      return Responser.send("Name already in use by another domain");
    } else if (existingValue.length > 0) {
      Responser.setStatusCode(StatusCodes.CONFLICT);
      Responser.setMessage("Value already in use");
      return Responser.send("Value already in use by another domain");
    }
    else if (existingDNS.length === 0) {
      Responser.setStatusCode(StatusCodes.NOT_FOUND);
      Responser.setMessage("DNS record not found");
      return Responser.send("DNS record not found");
    }
    else {  
      // prepare update object
      const updateObject: any = {};
      if (name) updateObject.name = name;
      if (type) updateObject.type = type;
      if (value) updateObject.value = value;
      if (ttl) updateObject.ttl = ttl;
      
      const dnsUpdateResult = await DNSCollectionClient.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateObject }
      );

      if (dnsUpdateResult.matchedCount === 0) {
        Responser.setStatusCode(StatusCodes.NOT_FOUND);
        Responser.setMessage("DNS record not found");
        return Responser.send("DNS record not found");
      }

      if (dnsUpdateResult.modifiedCount === 0) {
        Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
        Responser.setMessage("Failed to update DNS record");
        return Responser.send("Failed to update DNS record");
      }

      return Responser.send({ dnsRecordIds: dnsUpdateResult.upsertedId });
    }

  }
}