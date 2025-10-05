import { FastifyReply, FastifyRequest } from "fastify";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";

// service import
import DnsAddService from "../../Services/DNS/Add_DNS.service";



export default class DnsController {
  constructor() { }

  // Add a new DNS record
  public static async create(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { type, DomainName, IpAddress, ttl } = request.body;
    const Responser = new BuildResponse(reply, StatusCodes.CREATED, "DNS record created successfully");
    const dnsAddService = new DnsAddService(reply);
    try {
      await dnsAddService.addDnsRecord(DomainName, type, IpAddress, ttl, request.user);
    } catch (error) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Error adding DNS record");
      return Responser.send("An error occurred while adding the DNS record");
    }
  }
}