import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";
import DomainGroupService, { DomainGroupData } from "../../Services/AccessControl/DomainGroup.service";
import RequestControllerHelper from "../../helper/Request_Controller.helper";

// Singleton instance for request deduplication
const requestHelper = new RequestControllerHelper();

export default class DomainGroupController {
  constructor() { }

  public static async createDomainGroup(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const groupData = request.body as DomainGroupData;
    const requestKey = `create-domain-group:${request.user._id}:${groupData.name}`;

    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Failed to create domain group");
    const groupService = new DomainGroupService(reply);

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await groupService.createDomainGroup(groupData);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => console.log(`[DEDUP] Duplicate create domain group request detected for ${key}`),
      (key) => console.log(`[CLEANUP] Removed in-flight create domain group request for ${key}`)
    );
  }

  public static getDomainGroups(request: authGuardFastifyRequest, reply: FastifyReply) {
    const Responser = new BuildResponse(reply, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to fetch domain groups");
    const groupService = new DomainGroupService(reply);

    try {
      const requestQuery = request.query as { skip?: string; limit?: string };
      const skip = parseFloat(requestQuery.skip || "0") || 0;
      const limit = parseFloat(requestQuery.limit || "50") || 50;
      return groupService.getDomainGroups(skip, limit);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static getDomainGroupById(request: authGuardFastifyRequest, reply: FastifyReply) {
    const Responser = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Failed to fetch domain group");
    const groupService = new DomainGroupService(reply);

    try {
      const { groupId } = request.params as { groupId: string };
      return groupService.getDomainGroupById(groupId);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async updateDomainGroup(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { groupId } = request.params as { groupId: string };
    const updateData = request.body as Partial<DomainGroupData>;
    const requestKey = `update-domain-group:${request.user._id}:${groupId}`;

    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Failed to update domain group");
    const groupService = new DomainGroupService(reply);

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await groupService.updateDomainGroup(groupId, updateData);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => console.log(`[DEDUP] Duplicate update domain group request detected for ${key}`),
      (key) => console.log(`[CLEANUP] Removed in-flight update domain group request for ${key}`)
    );
  }

  public static async deleteDomainGroup(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { groupId } = request.params as { groupId: string };
    const requestKey = `delete-domain-group:${request.user._id}:${groupId}`;

    const Responser = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Failed to delete domain group");
    const groupService = new DomainGroupService(reply);

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await groupService.deleteDomainGroup(groupId);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => console.log(`[DEDUP] Duplicate delete domain group request detected for ${key}`),
      (key) => console.log(`[CLEANUP] Removed in-flight delete domain group request for ${key}`)
    );
  }
}
