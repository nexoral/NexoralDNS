import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";


// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";
// db connections
import { getCollectionClient } from "../../Database/mongodb.db";
import { ObjectId } from "mongodb";


export default class DomainListService {
  private readonly fastifyReply: FastifyReply
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  // Add a new domain record
  public async getAllDomains(user: any): Promise<void> {

    // construct Response
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Domain retrieved successfully");
    const DomainCollectionClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAINS);
    const DNSCollectionClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);

    // Add domain to the domains collection
    if (!DomainCollectionClient || !DNSCollectionClient) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Database connection error");
      return Responser.send("Currently unable to connect to database");
    }

    const DomainList = await DomainCollectionClient.aggregate([
      {
        $match: {
          userId: new ObjectId(user._id)
        }
      },
      {
        $lookup: {
          from: DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS,
          localField: "_id",
          foreignField: "domainId",
          as: "dnsRecords"
        }
      }
    ]).toArray();

    return Responser.send({ domains: DomainList });
  }

}