import { logger } from 'nexoraldns-shared';
import { FastifyReply, FastifyRequest } from "fastify";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";

// service import
import DomainAddService from "../../Services/Domain/Add_Domain.service";

import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";
import DomainListService from "../../Services/Domain/Domain_List.service";
import DomainRemoveService from "../../Services/Domain/Remove_Domain.service";
import RequestControllerHelper from "../../helper/Request_Controller.helper";
import container from '../../container/appContainer';

// Singleton instance for request deduplication
const requestHelper = new RequestControllerHelper();

export default class DomainController {
  constructor() { }

  // Add a new domain record
  public static async create(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { type, DomainName, IpAddress } = request.body;

    // Create a unique key for this request to prevent duplicate processing
    const requestKey = `${request.user._id}:${DomainName}:${IpAddress}`;

    const Responser = new BuildResponse(reply, StatusCodes.CREATED, "Domain created successfully");
    const domainAddService = container.get<DomainAddService>('AddDomainService');

    // Execute with deduplication logic
    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await domainAddService.addDomain(DomainName, type, IpAddress, request.user, reply);
        } catch (error) {
          Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
          Responser.setMessage("Error adding domain");
          return Responser.send("An error occurred while adding the domain");
        }
      },
      (key) => {
        logger.info(`[DEDUP] Duplicate request detected for ${key}, waiting for existing request...`);
      },
      (key) => {
        logger.info(`[CLEANUP] Removed in-flight request for ${key}`);
      }
    );

    logger.info(`[CREATE] Processing domain creation request for ${DomainName} by user ${request.user._id}`);
  }

  // List all domains for the authenticated user
  public static async list(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.OK, "Domain list fetched successfully");
    const domainListService = container.get<DomainListService>('DomainListService');
    try {
      await domainListService.getAllDomains(request.user, reply);
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
    const domainRemoveService = container.get<DomainRemoveService>('RemoveDomainService');
    try {
      await domainRemoveService.removeDomain(domainName, request.user, reply);
    } catch (error) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Error removing domain");
      return Responser.send("An error occurred while removing the domain");
    }
  }
}