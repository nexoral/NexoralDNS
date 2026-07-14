import { logger } from 'nexoraldns-shared';
import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";
import UsersService, { CreateUserData, UpdateUserData } from "../../Services/Users/Users.service";
import RequestControllerHelper from "../../helper/Request_Controller.helper";
import container from "../../container/appContainer";

const requestHelper = new RequestControllerHelper();

export default class UsersController {
  constructor() { }

  public static async createUser(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const userData = request.body as CreateUserData;
    const requestKey = `create-user:${request.user._id}:${userData.username}`;

    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Failed to create user");
    const usersService = container.get<UsersService>('UsersService');

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await usersService.createUser(userData, request.user._id, reply);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => logger.info(`[DEDUP] Duplicate create user request detected for ${key}`),
      (key) => logger.info(`[CLEANUP] Removed in-flight create user request for ${key}`)
    );
  }

  public static async getUsers(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to fetch users");
    const usersService = container.get<UsersService>('UsersService');

    try {
      const requestQuery = request.query as { skip?: string; limit?: string };
      const skip = parseFloat(requestQuery.skip || "0") || 0;
      const limit = parseFloat(requestQuery.limit || "50") || 50;
      return usersService.getUsers(skip, limit, reply);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async getUserById(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Failed to fetch user");
    const usersService = container.get<UsersService>('UsersService');

    try {
      const { userId } = request.params as { userId: string };
      return usersService.getUserById(userId, reply);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async updateUser(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId } = request.params as { userId: string };
    const updateData = request.body as UpdateUserData;
    const requestKey = `update-user:${request.user._id}:${userId}`;

    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Failed to update user");
    const usersService = container.get<UsersService>('UsersService');

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await usersService.updateUser(userId, updateData, request.user._id, reply);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => logger.info(`[DEDUP] Duplicate update user request detected for ${key}`),
      (key) => logger.info(`[CLEANUP] Removed in-flight update user request for ${key}`)
    );
  }

  public static async resetPassword(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId } = request.params as { userId: string };
    const { newPassword } = request.body as { newPassword: string };
    const requestKey = `reset-password:${request.user._id}:${userId}`;

    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Failed to reset password");
    const usersService = container.get<UsersService>('UsersService');

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await usersService.resetPassword(userId, newPassword, reply);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => logger.info(`[DEDUP] Duplicate reset password request detected for ${key}`),
      (key) => logger.info(`[CLEANUP] Removed in-flight reset password request for ${key}`)
    );
  }

  public static async deleteUser(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId } = request.params as { userId: string };
    const requestKey = `delete-user:${request.user._id}:${userId}`;

    const Responser = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Failed to delete user");
    const usersService = container.get<UsersService>('UsersService');

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await usersService.deleteUser(userId, request.user._id, reply);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => logger.info(`[DEDUP] Duplicate delete user request detected for ${key}`),
      (key) => logger.info(`[CLEANUP] Removed in-flight delete user request for ${key}`)
    );
  }
}
