import { FastifyReply } from "fastify";
import buildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";

// Services
import HealthService from "../../Services/Public/Health.service";
import InfoService from "../../Services/Public/Info.service";

export default class PublicInfoController {
  constructor() { }

  static async getInfo(reply: FastifyReply): Promise<any> {
    // Construct Fastify Response Class
    const FastifyResponse = new buildResponse(reply, StatusCodes.OK, "NexoralDNS Info");
    return FastifyResponse.send(
      await InfoService.getInfo(),
    );
  }

  static async getHealth(reply: FastifyReply): Promise<any> {
    const FastifyResponse = new buildResponse(reply, StatusCodes.OK, "NexoralDNS is healthy");
    return FastifyResponse.send(
      await HealthService.checkHealth(),
    );
    }
}