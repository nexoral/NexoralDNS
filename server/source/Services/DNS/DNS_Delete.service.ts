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

  // Delete a DNS record
  public async deleteDnsRecord(id: string, domainName: string, user: any): Promise<void> {

    // construct Response
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "DNS record deleted successfully");
    const DomainCollectionClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAINS);
    const DNSCollectionClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);

    // Add domain to the domains collection
    if (!DomainCollectionClient || !DNSCollectionClient) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Database connection error");
      return Responser.send("Currently unable to connect to database");
    }

    const existingDNS = await DNSCollectionClient.find({ _id: new ObjectId(id) }).toArray();
    const existingName = await DomainCollectionClient.find({ domain: domainName }).toArray();

    // Domain With DNS Records
    const DnsList = await DomainCollectionClient.aggregate([
      {
        $match: {
          userId: new ObjectId(user._id),
          domain: domainName
        }
      },
      {
        $lookup: {
          from: DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS,
          localField: "_id",
          foreignField: "domainId",
          as: "dnsRecords"
        }
      },
      { $unwind: "$dnsRecords" },
      {
        $replaceRoot: { newRoot: "$dnsRecords" }
      }
    ]).toArray();

    if (existingName.length === 0) {
      Responser.setStatusCode(StatusCodes.NOT_FOUND);
      Responser.setMessage("Domain not found");
      return Responser.send("Domain not found in the system");
    }
    else if (existingDNS.length === 0) {
      Responser.setStatusCode(StatusCodes.NOT_FOUND);
      Responser.setMessage("DNS record not found");
      return Responser.send("DNS record not found in the system");
    }
    else {

      if (DnsList.length === 1) {
        const deleteResult = await DNSCollectionClient.deleteOne({ _id: new ObjectId(id) });
        const domainDeleteResult = await DomainCollectionClient.deleteOne({ domain: domainName, userId: new ObjectId(user._id) });

        if (deleteResult.deletedCount === 0) {
          Responser.setStatusCode(StatusCodes.NOT_FOUND);
          Responser.setMessage("DNS record not found");
          return Responser.send("DNS record not found");
        }

        Responser.setMessage("DNS record and associated domain deleted successfully");
        return Responser.send({ deletedDNSCount: deleteResult.deletedCount, deletedDomainCount: domainDeleteResult.deletedCount });
      }

      const deleteResult = await DNSCollectionClient.deleteOne({ _id: new ObjectId(id) });

      if (deleteResult.deletedCount === 0) {
        Responser.setStatusCode(StatusCodes.NOT_FOUND);
        Responser.setMessage("DNS record not found");
        return Responser.send("DNS record not found");
      }

      Responser.setMessage("DNS record deleted successfully");
      return Responser.send({ deletedCount: deleteResult.deletedCount });
    }

  }
}