import { FastifyReply } from "fastify";
import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";
import { ObjectId } from "mongodb";

import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { getCollectionClient } from "../../Database/mongodb.db";
import { verifyToken, generateAccessToken } from "../../helper/jwt.helper";
import RedisCache from "../../Redis/Redis.cache";

export default class RefreshTokenService {
  private readonly fastifyReply: FastifyReply;
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  public async refresh(refreshToken: string): Promise<void> {
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Token refreshed successfully");
    const sessionCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SESSION_MANAGE);
    const usersCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.USERS);

    if (!sessionCol || !usersCol) {
      return Responser.send("Database connection error", StatusCodes.INTERNAL_SERVER_ERROR, "Database Error");
    }

    // Verify refresh token signature and expiry
    const decoded = verifyToken(refreshToken);
    if (!decoded.valid || !decoded.data?._id) {
      return Responser.send("Invalid or expired refresh token", StatusCodes.UNAUTHORIZED, "Unauthorized");
    }

    // Check session exists and is active
    const session = await sessionCol.findOne({ refreshToken });
    if (!session || !session.isLoggedIn) {
      return Responser.send("Session expired, please login again", StatusCodes.UNAUTHORIZED, "Unauthorized");
    }

    // Re-fetch user + fresh role/permissions so access token has up-to-date data
    const userId = decoded.data._id as string;
    const fullDetails = await usersCol.aggregate([
      { $match: { _id: new ObjectId(userId) } },
      {
        $lookup: {
          from: DB_DEFAULT_CONFIGS.Collections.ROLES,
          localField: "roleId",
          foreignField: "_id",
          as: "role"
        }
      },
      { $unwind: "$role" },
      {
        $lookup: {
          from: DB_DEFAULT_CONFIGS.Collections.PERMISSIONS,
          localField: "role.permissions",
          foreignField: "_id",
          as: "permissions"
        }
      },
      { $project: { password: 0 } }
    ]).toArray();

    if (fullDetails.length === 0) {
      return Responser.send("User not found", StatusCodes.UNAUTHORIZED, "Unauthorized");
    }

    const userDetails = fullDetails[0];
    const permissionCodes: number[] = (userDetails.permissions as { code: number }[]).map(p => p.code);

    const newAccessToken = generateAccessToken({
      _id: userId,
      username: userDetails.username,
      roleId: String(userDetails.roleId),
      permissionCodes,
    });

    if (!newAccessToken) {
      return Responser.send("Failed to generate token", StatusCodes.INTERNAL_SERVER_ERROR, "Token Generation Failed");
    }

    // Evict old access token from Redis before replacing it
    if (session.accessToken) {
      await RedisCache.delete(`session:${session.accessToken}`);
    }

    // Update session with new access token
    await sessionCol.updateOne(
      { refreshToken },
      { $set: { accessToken: newAccessToken, updatedAt: new Date() } }
    );

    // Set new access_token cookie
    const reply = this.fastifyReply as unknown as {
      setCookie(name: string, value: string, options: Record<string, unknown>): void;
    };
    reply.setCookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 60,
    });

    return Responser.send({ message: "Token refreshed successfully" });
  }
}
