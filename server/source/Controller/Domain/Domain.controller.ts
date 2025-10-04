import { FastifyReply, FastifyRequest } from "fastify";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";

// service import
import DomainAddService from "../../Services/Domain/Add_Domain.service";

import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";
import DomainListService from "../../Services/Domain/Domain_List.service";


export default class DomainController {
  constructor() { }

  public static async create(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { type, DomainName, IpAddress } = request.body;
    const Responser = new BuildResponse(reply, StatusCodes.CREATED, "Domain created successfully");
    const domainAddService = new DomainAddService(reply);
    try {
      await domainAddService.addDomain(DomainName, type, IpAddress, request.user);
    } catch (error) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Error adding domain");
      return Responser.send("An error occurred while adding the domain");
    }
  }

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
}