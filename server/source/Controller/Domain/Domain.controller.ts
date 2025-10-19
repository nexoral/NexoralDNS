import { FastifyReply, FastifyRequest } from "fastify";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";

// service import
import DomainAddService from "../../Services/Domain/Add_Domain.service";

import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";
import DomainListService from "../../Services/Domain/Domain_List.service";
import DomainRemoveService from "../../Services/Domain/Remove_Domain.service";

// In-flight request tracking to prevent duplicate processing
const inFlightRequests = new Map<string, Promise<void>>();

export default class DomainController {
  constructor() { }

  // Add a new domain record
  public static async create(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { type, DomainName, IpAddress } = request.body;

    // Create a unique key for this request to prevent duplicate processing
    const requestKey = `${request.user._id}:${DomainName}:${IpAddress}`;

    // Check if this request is already being processed
    if (inFlightRequests.has(requestKey)) {
      console.log(`[DEDUP] Duplicate request detected for ${requestKey}, waiting for existing request...`);
      // Wait for the in-flight request to complete
      await inFlightRequests.get(requestKey);
      return;
    }

    console.log(`[CREATE] Processing domain creation request for ${DomainName} by user ${request.user._id}`);

    const Responser = new BuildResponse(reply, StatusCodes.CREATED, "Domain created successfully");
    const domainAddService = new DomainAddService(reply);

    // Create the promise for this request
    const requestPromise = (async () => {
      try {
        await domainAddService.addDomain(DomainName, type, IpAddress, request.user);
      } catch (error) {
        Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
        Responser.setMessage("Error adding domain");
        return Responser.send("An error occurred while adding the domain");
      } finally {
        // Remove from in-flight requests after completion
        inFlightRequests.delete(requestKey);
        console.log(`[CLEANUP] Removed in-flight request for ${requestKey}`);
      }
    })();

    // Store the promise
    inFlightRequests.set(requestKey, requestPromise);

    // Wait for completion
    await requestPromise;
  }

  // List all domains for the authenticated user
  public static async list(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.OK, "Domain list fetched successfully");
    const domainListService = new DomainListService(reply);
    try {
      await domainListService.getAllDomains(request.user);
    } catch (error) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Error fetching domain list");
      return Responser.send("An error occurred while fetching the domain list");
    }
  }

  // Remove a domain record
  public static async remove(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { domainName } = request.body as { domainName: string };
    const Responser = new BuildResponse(reply, StatusCodes.OK, "Domain removed successfully");
    const domainRemoveService = new DomainRemoveService(reply);
    try {
      await domainRemoveService.removeDomain(domainName, request.user);
    } catch (error) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Error removing domain");
      return Responser.send("An error occurred while removing the domain");
    }
  }
}