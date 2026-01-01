import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";
import IPGroupService, { IPGroupData } from "../../Services/AccessControl/IPGroup.service";
import RequestControllerHelper from "../../helper/Request_Controller.helper";

// Singleton instance for request deduplication
const requestHelper = new RequestControllerHelper();

export default class IPGroupController {
  constructor() { }

  public static async createIPGroup(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const groupData = request.body as IPGroupData;
    const requestKey = `create-ip-group:${request.user._id}:${groupData.name}`;

    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Failed to create IP group");
    const groupService = new IPGroupService(reply);

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await groupService.createIPGroup(groupData);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => console.log(`[DEDUP] Duplicate create IP group request detected for ${key}`),
      (key) => console.log(`[CLEANUP] Removed in-flight create IP group request for ${key}`)
    );
  }

  public static getIPGroups(request: authGuardFastifyRequest, reply: FastifyReply) {
    const Responser = new BuildResponse(reply, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to fetch IP groups");
    const groupService = new IPGroupService(reply);

    try {
      const requestQuery = request.query as { skip?: string; limit?: string };
      const skip = parseFloat(requestQuery.skip || "0") || 0;
      const limit = parseFloat(requestQuery.limit || "50") || 50;
      return groupService.getIPGroups(skip, limit);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static getIPGroupById(request: authGuardFastifyRequest, reply: FastifyReply) {
    const Responser = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Failed to fetch IP group");
    const groupService = new IPGroupService(reply);

    try {
      const { groupId } = request.params as { groupId: string };
      return groupService.getIPGroupById(groupId);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async updateIPGroup(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { groupId } = request.params as { groupId: string };
    const updateData = request.body as Partial<IPGroupData>;
    const requestKey = `update-ip-group:${request.user._id}:${groupId}`;

    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Failed to update IP group");
    const groupService = new IPGroupService(reply);

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await groupService.updateIPGroup(groupId, updateData);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => console.log(`[DEDUP] Duplicate update IP group request detected for ${key}`),
      (key) => console.log(`[CLEANUP] Removed in-flight update IP group request for ${key}`)
    );
  }

  public static async deleteIPGroup(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { groupId } = request.params as { groupId: string };
    const requestKey = `delete-ip-group:${request.user._id}:${groupId}`;

    const Responser = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Failed to delete IP group");
    const groupService = new IPGroupService(reply);

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await groupService.deleteIPGroup(groupId);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => console.log(`[DEDUP] Duplicate delete IP group request detected for ${key}`),
      (key) => console.log(`[CLEANUP] Removed in-flight delete IP group request for ${key}`)
    );
  }
}
