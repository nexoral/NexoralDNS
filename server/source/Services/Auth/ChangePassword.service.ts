import { FastifyReply } from "fastify";
import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";
import { ObjectId } from "mongodb";

import { DB_DEFAULT_CONFIGS } from "../../core/key";
import Bcrypt from "../../helper/bcrypt.helper";
import container from "../../container/appContainer";
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { RedisCacheService } from "../../Redis/Redis.cache";
import { validatePasswordStrength } from "../../helper/passwordPolicy.helper";

export default class ChangePasswordService {
  constructor() { }

  public async changePassword(userId: string, currentPassword: string, newPassword: string, reply: FastifyReply): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.OK, "Password changed successfully");
    const usersCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.USERS);
    const sessionCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.SESSION_MANAGE);

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
    (reply as unknown as {
      clearCookie(name: string, options: Record<string, unknown>): void;
    }).clearCookie('access_token', { path: '/' });
    (reply as unknown as {
      clearCookie(name: string, options: Record<string, unknown>): void;
    }).clearCookie('refresh_token', { path: '/' });

    return Responser.send({ passwordUpdatedAt });
  }
}
