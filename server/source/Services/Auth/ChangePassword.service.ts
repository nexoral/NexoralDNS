import { FastifyReply } from "fastify";
import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";
import { ObjectId } from "mongodb";

import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { getCollectionClient } from "../../Database/mongodb.db";
import Bcrypt from "../../helper/bcrypt.helper";
import container from "../../container/appContainer";
import { RedisCacheService } from "../../Redis/Redis.cache";
import { validatePasswordStrength } from "../../helper/passwordPolicy.helper";

export default class ChangePasswordService {
  private readonly fastifyReply: FastifyReply;
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  public async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Password changed successfully");
    const usersCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.USERS);
    const sessionCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SESSION_MANAGE);

    if (!usersCol || !sessionCol) {
      return Responser.send("Database connection error", StatusCodes.INTERNAL_SERVER_ERROR, "Database Error");
    }

    const user = await usersCol.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return Responser.send("User not found", StatusCodes.NOT_FOUND, "User Not Found");
    }

    const isPasswordValid = await new Bcrypt().Compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return Responser.send("Current password is incorrect", StatusCodes.UNAUTHORIZED, "Invalid Password");
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return Responser.send(strength.message, StatusCodes.BAD_REQUEST, "Invalid Password");
    }

    const isSamePassword = await new Bcrypt().Compare(newPassword, user.password);
    if (isSamePassword) {
      return Responser.send("New password cannot be the same as the current password", StatusCodes.BAD_REQUEST, "Invalid Password");
    }

    const hashedPassword = await new Bcrypt().Encrypt(newPassword);
    const passwordUpdatedAt = new Date();

    await usersCol.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password: hashedPassword, passwordUpdatedAt } }
    );

    // Evict session from Redis and invalidate in DB — forces re-login on all devices
    const session = await sessionCol.findOne({ userId: new ObjectId(userId) });
    if (session?.accessToken) {
      await container.get<RedisCacheService>('RedisCacheService').delete(`session:${session.accessToken}`);
    }
    await sessionCol.updateOne(
      { userId: new ObjectId(userId) },
      { $set: { isLoggedIn: false, accessToken: null, refreshToken: null, updatedAt: new Date() } }
    );

    // Clear cookies on this device
    const reply = this.fastifyReply as unknown as {
      clearCookie(name: string, options: Record<string, unknown>): void;
    };
    reply.clearCookie('access_token', { path: '/' });
    reply.clearCookie('refresh_token', { path: '/' });

    return Responser.send({ passwordUpdatedAt });
  }
}
