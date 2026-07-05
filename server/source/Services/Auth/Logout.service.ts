import { FastifyReply } from "fastify";
import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";

import { DB_DEFAULT_CONFIGS } from "../../core/key";
import container from "../../container/appContainer";
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { RedisCacheService } from "../../Redis/Redis.cache";

export default class LogoutService {
  constructor() { }

  public async logout(accessToken: string, reply: FastifyReply): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.OK, "Logged out successfully");
    const sessionCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.SESSION_MANAGE);

    if (!sessionCol) {
      return Responser.send("Database connection error", StatusCodes.INTERNAL_SERVER_ERROR, "Database Error");
    }

    await sessionCol.updateOne(
      { accessToken },
      {
        $set: {
          isLoggedIn: false,
          accessToken: null,
          refreshToken: null,
          updatedAt: new Date(),
        },
      }
    );

    // Evict from Redis immediately so the old token is rejected on next request
    await container.get<RedisCacheService>('RedisCacheService').delete(`session:${accessToken}`);

    (reply as unknown as {
      clearCookie(name: string, options: Record<string, unknown>): void;
    }).clearCookie('access_token', { path: '/' });
    (reply as unknown as {
      clearCookie(name: string, options: Record<string, unknown>): void;
    }).clearCookie('refresh_token', { path: '/' });

    return Responser.send("Logged out successfully");
  }
}
