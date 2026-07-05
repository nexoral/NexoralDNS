import container from '../../container/appContainer';
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";


// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";
// db connections
import { ObjectId } from "mongodb";


export default class DnsListService {
  private readonly fastifyReply: FastifyReply
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  // Add a new DNS record
  public async getAllDns(domainName: string, user: any): Promise<void> {

    // construct Response
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "DNS records retrieved successfully");
    const DomainCollectionClient = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.DOMAINS);
    const DNSCollectionClient = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);

    // Add domain to the domains collection
    if (!DomainCollectionClient || !DNSCollectionClient) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Database connection error");
      return Responser.send("Currently unable to connect to database");
    }

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

    return Responser.send({ DNS_List: DnsList });
  }

}