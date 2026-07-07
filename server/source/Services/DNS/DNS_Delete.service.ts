import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";


// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";

// db connections
import { ObjectId } from "mongodb";
import container from "../../container/appContainer";
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { RedisCacheService } from "../../Redis/Redis.cache";
import CacheKeys from "../../Redis/CacheKeys.cache";


export default class DnsUpdateService {
  constructor() { }

  // Delete a DNS record
  public async deleteDnsRecord(id: string, domainName: string, user: any, reply: FastifyReply): Promise<void> {

    // construct Response
    const Responser = new BuildResponse(reply, StatusCodes.OK, "DNS record deleted successfully");
    const DomainCollectionClient = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.DOMAINS);
    const DNSCollectionClient = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);

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

      // Ownership enforcement: the target record MUST be one the caller owns
      // (present in the user-scoped DnsList). This guards BOTH branches — without
      // it, a user could delete another user's record by passing its id alongside
      // one of their own domains. Return 404 to avoid revealing existence.
      const target = DnsList.find((record) => record._id.toString() === id);
      if (!target) {
        Responser.setStatusCode(StatusCodes.NOT_FOUND);
        Responser.setMessage("DNS record not found");
        return Responser.send("DNS record not found");
      }

      const cache = container.get<RedisCacheService>('RedisCacheService');
      // Engine caches by record name — invalidate that key, not the domain name.
      const cacheKey = `${CacheKeys.Domain_DNS_Record}:${target.name}`;

      if (DnsList.length === 1) {
        const deleteResult = await DNSCollectionClient.deleteOne({ _id: new ObjectId(id) });
        const domainDeleteResult = await DomainCollectionClient.deleteOne({ domain: domainName, userId: new ObjectId(user._id) });

        if (deleteResult.deletedCount === 0) {
          Responser.setStatusCode(StatusCodes.NOT_FOUND);
          Responser.setMessage("DNS record not found");
          return Responser.send("DNS record not found");
        }

        Responser.setMessage("DNS record and associated domain deleted successfully");
        await cache.delete(cacheKey);
        return Responser.send({ deletedDNSCount: deleteResult.deletedCount, deletedDomainCount: domainDeleteResult.deletedCount });
      }

      const deleteResult = await DNSCollectionClient.deleteOne({ _id: new ObjectId(id) });

      if (deleteResult.deletedCount === 0) {
        Responser.setStatusCode(StatusCodes.NOT_FOUND);
        Responser.setMessage("DNS record not found");
        return Responser.send("DNS record not found");
      }

      Responser.setMessage("DNS record deleted successfully");
      await cache.delete(cacheKey);
      return Responser.send({ deletedCount: deleteResult.deletedCount });
    }

  }
}