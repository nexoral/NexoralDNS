import { FastifyReply } from "fastify";
import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";

import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { getCollectionClient } from "../../Database/mongodb.db";
import RedisCache from "../../Redis/Redis.cache";

export default class LogoutService {
  private readonly fastifyReply: FastifyReply;
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  public async logout(accessToken: string): Promise<void> {
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Logged out successfully");
    const sessionCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SESSION_MANAGE);

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
    await RedisCache.delete(`session:${accessToken}`);

    const reply = this.fastifyReply as unknown as {
      clearCookie(name: string, options: Record<string, unknown>): void;
    };
    reply.clearCookie('access_token', { path: '/' });
    reply.clearCookie('refresh_token', { path: '/' });

    return Responser.send("Logged out successfully");
  }
}
