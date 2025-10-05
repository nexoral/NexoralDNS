import { FastifyReply, FastifyRequest } from "fastify";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";

// service import
import DnsAddService from "../../Services/DNS/Add_DNS.service";
import DnsListService from "../../Services/DNS/DNS_List.service";



export default class DnsController {
  constructor() { }

  // Add a new DNS record
  public static async create(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { name, type, DomainName, value, ttl } = request.body;
    const Responser = new BuildResponse(reply, StatusCodes.CREATED, "DNS record created successfully");
    const dnsAddService = new DnsAddService(reply);
    try {
      await dnsAddService.addDnsRecord(DomainName, name, type, value, ttl, request.user);
    } catch (error) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Error adding DNS record");
      return Responser.send("An error occurred while adding the DNS record");
    }
  }

  // Get all DNS records for a domain
  public static async list(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { domain } = request.params as { domain: string };
    const Responser = new BuildResponse(reply, StatusCodes.OK, "DNS records retrieved successfully");
    const dnsListService = new DnsListService(reply);

    try {
      await dnsListService.getAllDns(domain, request.user);
    } catch (error) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Error retrieving DNS records");
      return Responser.send("An error occurred while retrieving DNS records");
    }
  }
}