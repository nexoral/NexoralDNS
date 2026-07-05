import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import { ObjectId } from "mongodb";
import BuildResponse from "../../helper/responseBuilder.helper";
import { DB_DEFAULT_CONFIGS } from "../../core/key";
import Bcrypt from "../../helper/bcrypt.helper";
import container from "../../container/appContainer";
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { RedisCacheService } from "../../Redis/Redis.cache";
import { validatePasswordStrength } from "../../helper/passwordPolicy.helper";

export interface CreateUserData {
  username: string;
  password: string;
  roleId: string;
}

export interface UpdateUserData {
  username?: string;
  roleId?: string;
  isActive?: boolean;
}

// Projection shared by every read path so a password hash never leaves the service layer
const PUBLIC_USER_PROJECTION = { password: 0 } as const;

export default class UsersService {

  constructor() { }

  public async createUser(userData: CreateUserData, createdBy: string, reply: FastifyReply): Promise<void> {
    const username = userData.username?.trim();
    if (!username) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid username");
      return ErrorResponse.send({ error: "Username is required" });
    }

    if (!ObjectId.isValid(userData.roleId)) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid role");
      return ErrorResponse.send({ error: "The provided role ID is not valid" });
    }

    const strength = validatePasswordStrength(userData.password);
    if (!strength.valid) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Weak password");
      return ErrorResponse.send({ error: strength.message });
    }

    const usersCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.USERS);
    const rolesCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.ROLES);
    if (!usersCol || !rolesCol) {
      throw new Error("Database connection error.");
    }

    const existingUser = await usersCol.findOne({ username });
    if (existingUser) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.CONFLICT, "User already exists");
      return ErrorResponse.send({ error: `A user with the username "${username}" already exists` });
    }

    const role = await rolesCol.findOne({ _id: new ObjectId(userData.roleId) });
    if (!role) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid role");
      return ErrorResponse.send({ error: `Role with ID "${userData.roleId}" not found` });
    }

    const hashedPassword = await new Bcrypt().Encrypt(userData.password);

    const newUser = {
      username,
      password: hashedPassword,
      roleId: role._id,
      // null triggers the existing forced "change your password" gate on first login
      passwordUpdatedAt: null,
      isActive: true,
      createdBy: new ObjectId(createdBy),
      createdAt: Date.now(),
    };

    const result = await usersCol.insertOne(newUser);

    const Responser = new BuildResponse(reply, StatusCodes.CREATED, "User created successfully");
    return Responser.send({
      userId: result.insertedId,
      user: { ...newUser, password: undefined },
      message: `User "${username}" has been created successfully`,
    });
  }

  public async getUsers(skip: number = 0, limit: number = 50, reply: FastifyReply): Promise<void> {
    const usersCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.USERS);
    if (!usersCol) {
      throw new Error("Database connection error.");
    }

    const total = await usersCol.countDocuments();
    const users = await usersCol.aggregate([
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: PUBLIC_USER_PROJECTION },
      {
        $lookup: {
          from: DB_DEFAULT_CONFIGS.Collections.ROLES,
          localField: "roleId",
          foreignField: "_id",
          as: "role",
        },
      },
      { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
    ]).toArray();

    const Responser = new BuildResponse(reply, StatusCodes.OK, "Users fetched successfully");
    return Responser.send({ users, total, skip, limit });
  }

  public async getUserById(userId: string, reply: FastifyReply): Promise<void> {
    if (!ObjectId.isValid(userId)) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid user ID");
      return ErrorResponse.send({ error: "The provided user ID is not valid" });
    }

    const usersCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.USERS);
    if (!usersCol) {
      throw new Error("Database connection error.");
    }

    const users = await usersCol.aggregate([
      { $match: { _id: new ObjectId(userId) } },
      { $project: PUBLIC_USER_PROJECTION },
      {
        $lookup: {
          from: DB_DEFAULT_CONFIGS.Collections.ROLES,
          localField: "roleId",
          foreignField: "_id",
          as: "role",
        },
      },
      { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
    ]).toArray();

    if (users.length === 0) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.NOT_FOUND, "User not found");
      return ErrorResponse.send({ error: `User with ID "${userId}" not found` });
    }

    const Responser = new BuildResponse(reply, StatusCodes.OK, "User fetched successfully");
    return Responser.send({ user: users[0] });
  }

  public async updateUser(userId: string, updateData: UpdateUserData, requestingUserId: string, reply: FastifyReply): Promise<void> {
    if (!ObjectId.isValid(userId)) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid user ID");
      return ErrorResponse.send({ error: "The provided user ID is not valid" });
    }

    const usersCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.USERS);
    const rolesCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.ROLES);
    if (!usersCol || !rolesCol) {
      throw new Error("Database connection error.");
    }

    const existingUser = await usersCol.findOne({ _id: new ObjectId(userId) });
    if (!existingUser) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.NOT_FOUND, "User not found");
      return ErrorResponse.send({ error: `User with ID "${userId}" not found` });
    }

    const isSelf = userId === requestingUserId;
    if (isSelf && (updateData.roleId !== undefined || updateData.isActive === false)) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.FORBIDDEN, "Cannot modify your own access");
      return ErrorResponse.send({ error: "You cannot change your own role or deactivate your own account" });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedFields: Record<string, any> = {};

    if (updateData.username !== undefined) {
      const username = updateData.username.trim();
      if (!username) {
        const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid username");
        return ErrorResponse.send({ error: "Username cannot be empty" });
      }
      if (username !== existingUser.username) {
        const duplicateUser = await usersCol.findOne({ username });
        if (duplicateUser) {
          const ErrorResponse = new BuildResponse(reply, StatusCodes.CONFLICT, "Username already exists");
          return ErrorResponse.send({ error: `A user with the username "${username}" already exists` });
        }
      }
      updatedFields.username = username;
    }

    if (updateData.roleId !== undefined) {
      if (!ObjectId.isValid(updateData.roleId)) {
        const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid role");
        return ErrorResponse.send({ error: "The provided role ID is not valid" });
      }
      const role = await rolesCol.findOne({ _id: new ObjectId(updateData.roleId) });
      if (!role) {
        const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid role");
        return ErrorResponse.send({ error: `Role with ID "${updateData.roleId}" not found` });
      }
      updatedFields.roleId = role._id;
    }

    if (updateData.isActive !== undefined) {
      updatedFields.isActive = updateData.isActive;
    }

    await usersCol.updateOne({ _id: new ObjectId(userId) }, { $set: updatedFields });

    const Responser = new BuildResponse(reply, StatusCodes.OK, "User updated successfully");
    return Responser.send({ userId, updated: updatedFields });
  }

  public async resetPassword(userId: string, newPassword: string, reply: FastifyReply): Promise<void> {
    if (!ObjectId.isValid(userId)) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid user ID");
      return ErrorResponse.send({ error: "The provided user ID is not valid" });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Weak password");
      return ErrorResponse.send({ error: strength.message });
    }

    const usersCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.USERS);
    const sessionCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.SESSION_MANAGE);
    if (!usersCol || !sessionCol) {
      throw new Error("Database connection error.");
    }

    const existingUser = await usersCol.findOne({ _id: new ObjectId(userId) });
    if (!existingUser) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.NOT_FOUND, "User not found");
      return ErrorResponse.send({ error: `User with ID "${userId}" not found` });
    }

    const hashedPassword = await new Bcrypt().Encrypt(newPassword);

    await usersCol.updateOne(
      { _id: new ObjectId(userId) },
      // null triggers the forced "change your password" gate again on next login
      { $set: { password: hashedPassword, passwordUpdatedAt: null } }
    );

    // Evict the target user's session — same pattern as self-service change password,
    // just without touching the requesting admin's own cookies
    const session = await sessionCol.findOne({ userId: new ObjectId(userId) });
    if (session?.accessToken) {
      await container.get<RedisCacheService>('RedisCacheService').delete(`session:${session.accessToken}`);
    }
    await sessionCol.updateOne(
      { userId: new ObjectId(userId) },
      { $set: { isLoggedIn: false, accessToken: null, refreshToken: null, updatedAt: new Date() } }
    );

    const Responser = new BuildResponse(reply, StatusCodes.OK, "Password reset successfully");
    return Responser.send({ userId, message: `Temporary password set for "${existingUser.username}"` });
  }

  public async deleteUser(userId: string, requestingUserId: string, reply: FastifyReply): Promise<void> {
    if (!ObjectId.isValid(userId)) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid user ID");
      return ErrorResponse.send({ error: "The provided user ID is not valid" });
    }

    if (userId === requestingUserId) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.FORBIDDEN, "Cannot delete your own account");
      return ErrorResponse.send({ error: "You cannot delete your own account" });
    }

    const usersCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.USERS);
    const sessionCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.SESSION_MANAGE);
    if (!usersCol || !sessionCol) {
      throw new Error("Database connection error.");
    }

    const existingUser = await usersCol.findOne({ _id: new ObjectId(userId) });
    if (!existingUser) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.NOT_FOUND, "User not found");
      return ErrorResponse.send({ error: `User with ID "${userId}" not found` });
    }

    const session = await sessionCol.findOne({ userId: new ObjectId(userId) });
    if (session?.accessToken) {
      await container.get<RedisCacheService>('RedisCacheService').delete(`session:${session.accessToken}`);
    }

    await usersCol.deleteOne({ _id: new ObjectId(userId) });
    await sessionCol.deleteOne({ userId: new ObjectId(userId) });

    const Responser = new BuildResponse(reply, StatusCodes.OK, "User deleted successfully");
    return Responser.send({ userId, message: `User "${existingUser.username}" has been deleted successfully` });
  }
}
