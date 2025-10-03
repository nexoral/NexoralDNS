import { FastifyReply, FastifyRequest } from "fastify";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";

// service import
import DomainAddService from "../../Services/Domain/Add_Domain.service";

import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";


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
}