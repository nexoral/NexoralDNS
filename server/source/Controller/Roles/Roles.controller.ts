import logger from '../../utilities/logger';
import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";
import RolesService, { RoleData } from "../../Services/Roles/Roles.service";
import RequestControllerHelper from "../../helper/Request_Controller.helper";

const requestHelper = new RequestControllerHelper();

export default class RolesController {
  constructor() { }

  public static async getPermissions(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to fetch permissions");
    const rolesService = new RolesService(reply);

    try {
      return rolesService.getPermissions();
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async createRole(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const roleData = request.body as RoleData;
    const requestKey = `create-role:${request.user._id}:${roleData.name}`;

    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Failed to create role");
    const rolesService = new RolesService(reply);

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await rolesService.createRole(roleData);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => logger.info(`[DEDUP] Duplicate create role request detected for ${key}`),
      (key) => logger.info(`[CLEANUP] Removed in-flight create role request for ${key}`)
    );
  }

  public static async getRoles(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to fetch roles");
    const rolesService = new RolesService(reply);

    try {
      const requestQuery = request.query as { skip?: string; limit?: string };
      const skip = parseFloat(requestQuery.skip || "0") || 0;
      const limit = parseFloat(requestQuery.limit || "50") || 50;
      return rolesService.getRoles(skip, limit);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async getRoleById(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Failed to fetch role");
    const rolesService = new RolesService(reply);

    try {
      const { roleId } = request.params as { roleId: string };
      return rolesService.getRoleById(roleId);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async updateRole(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { roleId } = request.params as { roleId: string };
    const updateData = request.body as Partial<RoleData>;
    const requestKey = `update-role:${request.user._id}:${roleId}`;

    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Failed to update role");
    const rolesService = new RolesService(reply);

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await rolesService.updateRole(roleId, updateData);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => logger.info(`[DEDUP] Duplicate update role request detected for ${key}`),
      (key) => logger.info(`[CLEANUP] Removed in-flight update role request for ${key}`)
    );
  }

  public static async deleteRole(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { roleId } = request.params as { roleId: string };
    const requestKey = `delete-role:${request.user._id}:${roleId}`;

    const Responser = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Failed to delete role");
    const rolesService = new RolesService(reply);

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await rolesService.deleteRole(roleId);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => logger.info(`[DEDUP] Duplicate delete role request detected for ${key}`),
      (key) => logger.info(`[CLEANUP] Removed in-flight delete role request for ${key}`)
    );
  }
}
