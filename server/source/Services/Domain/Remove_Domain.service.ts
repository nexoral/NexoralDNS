import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";


// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";
// db connections
import { getCollectionClient } from "../../Database/mongodb.db";
import { ObjectId } from "mongodb";


export default class DomainRemoveService {
  private readonly fastifyReply: FastifyReply
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  // Remove a domain record
  public async removeDomain(domain: string, user: any): Promise<void> {

    // construct Response
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Domain removed successfully");
    const DomainCollectionClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAINS);
    const DNSCollectionClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);

    // Add domain to the domains collection
    if (!DomainCollectionClient || !DNSCollectionClient) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Database connection error");
      return Responser.send("Currently unable to connect to database");
    }

    const existingDomain = await DomainCollectionClient.findOne({ domain: domain, userId: new ObjectId(user._id) });

    if (!existingDomain) {
      Responser.setStatusCode(StatusCodes.NOT_FOUND);
      Responser.setMessage("Domain not found");
      return Responser.send("Domain not found for the user in the database");
    }

    // Delete associated DNS records
    const deleteDNSResult = await DNSCollectionClient.deleteMany({ domainId: existingDomain._id });

    if (deleteDNSResult.acknowledged === false) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Failed to delete associated DNS records");
      return Responser.send("Failed to delete associated DNS records");
    }

    // Delete the domain
    const deleteDomainResult = await DomainCollectionClient.deleteOne({ _id: existingDomain._id });
    
    if (deleteDomainResult.acknowledged === false) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Failed to delete domain");
      return Responser.send("Failed to delete domain");
    }

    return Responser.send({
      message: "Domain and associated DNS records removed successfully",
      deletedDomain: existingDomain.domain,
      deletedDNSRecordsCount: deleteDNSResult.deletedCount || 0
    });

  }

}