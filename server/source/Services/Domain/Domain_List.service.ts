import container from '../../container/appContainer';
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";


// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";
// db connections
import { ObjectId } from "mongodb";


export default class DomainListService {
  constructor() { }

  // Add a new domain record
  public async getAllDomains(user: any, reply: FastifyReply): Promise<void> {

    // construct Response
    const Responser = new BuildResponse(reply, StatusCodes.OK, "Domain retrieved successfully");
    const DomainCollectionClient = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.DOMAINS);
    const DNSCollectionClient = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);

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