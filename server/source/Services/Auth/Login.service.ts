import { FastifyReply } from "fastify";
import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";
import { ObjectId } from "mongodb";

import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { getCollectionClient } from "../../Database/mongodb.db";
import Bcrypt from "../../helper/bcrypt.helper";
import { generateAccessToken, generateRefreshToken } from "../../helper/jwt.helper";

export default class LoginService {
  private readonly fastifyReply: FastifyReply;
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  public async login(username: string, password: string): Promise<void> {
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Login successful");
    const usersCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.USERS);
    const sessionCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SESSION_MANAGE);

    if (!usersCol || !sessionCol) {
      return Responser.send("Database connection error", StatusCodes.INTERNAL_SERVER_ERROR, "Database Error");
    }

    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim()) {
      return Responser.send("Invalid username or password", StatusCodes.UNAUTHORIZED, "Authentication Failed");
    }

    const user = await usersCol.findOne({ username: username.trim() });
    if (!user) {
      return Responser.send("Invalid username or password", StatusCodes.UNAUTHORIZED, "Authentication Failed");
    }

    // isActive is absent on pre-existing users, which correctly defaults to allowed
    if (user.isActive === false) {
      return Responser.send("This account has been deactivated", StatusCodes.UNAUTHORIZED, "Authentication Failed");
    }

    const isPasswordValid = await new Bcrypt().Compare(password, user.password as string);
    if (!isPasswordValid) {
      return Responser.send("Invalid username or password", StatusCodes.UNAUTHORIZED, "Authentication Failed");
    }

    // Fetch role + permissions
    const fullDetails = await usersCol.aggregate([
      { $match: { _id: user._id } },
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
      return Responser.send("User role configuration error", StatusCodes.INTERNAL_SERVER_ERROR, "Role Error");
    }

    const userDetails = fullDetails[0];
    const permissionCodes: number[] = (userDetails.permissions as { code: number }[]).map(p => p.code);

    // Build token payloads — passwordUpdatedAt included so verifyToken returns it without extra DB call
    const accessPayload = {
      _id: String(user._id),
      username: user.username,
      roleId: String(user.roleId),
      permissionCodes,
      passwordUpdatedAt: user.passwordUpdatedAt ?? null,
    };
    const refreshPayload = { _id: String(user._id) };

    const accessToken = generateAccessToken(accessPayload);
    const refreshToken = generateRefreshToken(refreshPayload);

    if (!accessToken || !refreshToken) {
      return Responser.send("Failed to generate tokens", StatusCodes.INTERNAL_SERVER_ERROR, "Token Generation Failed");
    }

    // One document per user — upsert replaces the previous session on re-login,
    // invalidating the old tokens immediately
    await sessionCol.updateOne(
      { userId: new ObjectId(String(user._id)) },
      {
        $set: {
          roleId: user.roleId,
          accessToken,
          refreshToken,
          isLoggedIn: true,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    // Set httpOnly cookies
    const reply = this.fastifyReply as unknown as {
      setCookie(name: string, value: string, options: Record<string, unknown>): void;
    };
    reply.setCookie('access_token', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 60, // 30 minutes
    });
    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 48 * 60 * 60, // 48 hours
    });

    return Responser.send({
      user: {
        id: user._id,
        username: user.username,
        passwordUpdatedAt: user.passwordUpdatedAt ?? null,
        createdAt: user.createdAt,
        isActive: user.isActive !== false,
      },
      role: {
        id: userDetails.role._id,
        name: userDetails.role.name,
        permissions: userDetails.permissions,
      },
    });
  }
}
