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

  static async getServiceInfo (reply: FastifyReply): Promise<any> {
    const FastifyResponse = new buildResponse(reply, StatusCodes.OK, "NexoralDNS Service Info");
    return FastifyResponse.send(
      await InfoService.getServiceInfo(),
    );
  }

  static async getHealth(reply: FastifyReply): Promise<any> {
    try {
      const health = await HealthService.checkHealth();
      if (health.status === "unhealthy") {
        const FastifyResponse = new buildResponse(reply, StatusCodes.SERVICE_UNAVAILABLE, "NexoralDNS is unhealthy");
        return FastifyResponse.send(health);
      }
      const FastifyResponse = new buildResponse(reply, StatusCodes.OK, "NexoralDNS is healthy");
      return FastifyResponse.send(health);
    } catch (error: any) {
      const FastifyResponse = new buildResponse(reply, StatusCodes.INTERNAL_SERVER_ERROR, "Health check failed");
      return FastifyResponse.send({ error: error.message || error });
    }
  }
}