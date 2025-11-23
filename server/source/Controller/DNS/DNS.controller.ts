import { FastifyReply, FastifyRequest } from "fastify";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import RequestControllerHelper from "../../helper/Request_Controller.helper";

// service import
import DnsAddService from "../../Services/DNS/Add_DNS.service";
import DnsListService from "../../Services/DNS/DNS_List.service";
import DnsUpdateService from "../../Services/DNS/DNS_Update.service";
import DnsDeleteService from "../../Services/DNS/DNS_Delete.service";

// Singleton instance for request deduplication
const requestHelper = new RequestControllerHelper();

export default class DnsController {
  constructor() { }

  // Add a new DNS record
  public static async create(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { name, type, DomainName, value, ttl } = request.body;

    // Create a unique key for this request to prevent duplicate processing
    const requestKey = `${request.user._id}:${DomainName}:${name}:${value}`;

    const Responser = new BuildResponse(reply, StatusCodes.CREATED, "DNS record created successfully");
    const dnsAddService = new DnsAddService(reply);

    // Execute with deduplication logic
    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await dnsAddService.addDnsRecord(DomainName, name, type, value, ttl, request.user);
        } catch (error) {
          Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
          Responser.setMessage("Error adding DNS record");
          return Responser.send("An error occurred while adding the DNS record");
        }
      },
      (key) => {
        console.log(`[DEDUP] Duplicate DNS record request detected for ${key}, waiting for existing request...`);
      },
      (key) => {
        console.log(`[CLEANUP] Removed in-flight DNS record request for ${key}`);
      }
    );

    console.log(`[CREATE] Processing DNS record creation request for ${name} in domain ${DomainName} by user ${request.user._id}`);
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

  // update a DNS record
  public static async update(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const { name, type, value, ttl } = request.body;
    const Responser = new BuildResponse(reply, StatusCodes.OK, "DNS record updated successfully");
    const dnsUpdateService = new DnsUpdateService(reply);
    try {
      await dnsUpdateService.updateDnsRecord(id, name, type, value, ttl, request.user);
    } catch (error) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Error updating DNS record");
      return Responser.send("An error occurred while updating the DNS record");
    }
  }

  // Delete a DNS record by ID
  public static async delete(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    console.log(`[DELETE] Processing DNS record deletion request by user ${request.user._id}`);
    const { id, domainName } = request.body as { id: string, domainName: string };
    const Responser = new BuildResponse(reply, StatusCodes.OK, "DNS record deleted successfully");
    const dnsDeleteService = new DnsDeleteService(reply);

    try {
      await dnsDeleteService.deleteDnsRecord(id, domainName, request.user);
    } catch (error) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Error deleting DNS record");
      return Responser.send("An error occurred while deleting the DNS record");
    }
  }
}