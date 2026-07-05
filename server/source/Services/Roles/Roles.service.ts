import container from '../../container/appContainer';
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import { ObjectId } from "mongodb";
import BuildResponse from "../../helper/responseBuilder.helper";
import { DB_DEFAULT_CONFIGS } from "../../core/key";

export interface RoleData {
  name: string;
  permissionCodes: number[];
}

export default class RolesService {

  constructor() { }

  /**
   * List the fixed permission catalog so the UI can render a checkbox list
   * when building/editing a role.
   */
  public async getPermissions(reply: FastifyReply): Promise<void> {
    const permissionsCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.PERMISSIONS);
    if (!permissionsCol) {
      throw new Error("Database connection error.");
    }

    const permissions = await permissionsCol.find().sort({ code: 1 }).toArray();

    const Responser = new BuildResponse(reply, StatusCodes.OK, "Permissions fetched successfully");
    return Responser.send({ permissions });
  }

  public async createRole(roleData: RoleData, reply: FastifyReply): Promise<void> {
    const name = roleData.name?.trim();
    if (!name) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid role name");
      return ErrorResponse.send({ error: "Role name is required" });
    }

    if (!Array.isArray(roleData.permissionCodes) || roleData.permissionCodes.length === 0) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid permissions");
      return ErrorResponse.send({ error: "At least one permission is required" });
    }

    const rolesCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.ROLES);
    const permissionsCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.PERMISSIONS);
    if (!rolesCol || !permissionsCol) {
      throw new Error("Database connection error.");
    }

    const existingRole = await rolesCol.findOne({ name });
    if (existingRole) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.CONFLICT, "Role already exists");
      return ErrorResponse.send({ error: `A role with the name "${name}" already exists` });
    }

    const matchedPermissions = await permissionsCol
      .find({ code: { $in: roleData.permissionCodes } })
      .toArray();
    if (matchedPermissions.length !== roleData.permissionCodes.length) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid permissions");
      return ErrorResponse.send({ error: "One or more permission codes are invalid" });
    }

    // Role `code` is a stable numeric id only — never read by permission-check
    // logic (that reads permission codes embedded in the JWT), so a simple
    // increment is sufficient for this low-frequency, admin-driven operation.
    const highestRole = await rolesCol.find().sort({ code: -1 }).limit(1).toArray();
    const nextCode = (highestRole[0]?.code ?? 0) + 1;

    const newRole = {
      code: nextCode,
      name,
      permissions: matchedPermissions.map(p => p._id),
    };

    const result = await rolesCol.insertOne(newRole);

    const Responser = new BuildResponse(reply, StatusCodes.CREATED, "Role created successfully");
    return Responser.send({
      roleId: result.insertedId,
      role: { ...newRole, permissions: matchedPermissions },
      message: `Role "${name}" has been created successfully`,
    });
  }

  public async getRoles(skip: number = 0, limit: number = 50, reply: FastifyReply): Promise<void> {
    const rolesCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.ROLES);
    if (!rolesCol) {
      throw new Error("Database connection error.");
    }

    const total = await rolesCol.countDocuments();
    const roles = await rolesCol.aggregate([
      { $sort: { code: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: DB_DEFAULT_CONFIGS.Collections.PERMISSIONS,
          localField: "permissions",
          foreignField: "_id",
          as: "permissions",
        },
      },
    ]).toArray();

    const Responser = new BuildResponse(reply, StatusCodes.OK, "Roles fetched successfully");
    return Responser.send({ roles, total, skip, limit });
  }

  public async getRoleById(roleId: string, reply: FastifyReply): Promise<void> {
    if (!ObjectId.isValid(roleId)) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid role ID");
      return ErrorResponse.send({ error: "The provided role ID is not valid" });
    }

    const rolesCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.ROLES);
    if (!rolesCol) {
      throw new Error("Database connection error.");
    }

    const roles = await rolesCol.aggregate([
      { $match: { _id: new ObjectId(roleId) } },
      {
        $lookup: {
          from: DB_DEFAULT_CONFIGS.Collections.PERMISSIONS,
          localField: "permissions",
          foreignField: "_id",
          as: "permissions",
        },
      },
    ]).toArray();

    if (roles.length === 0) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Role not found");
      return ErrorResponse.send({ error: `Role with ID "${roleId}" not found` });
    }

    const Responser = new BuildResponse(reply, StatusCodes.OK, "Role fetched successfully");
    return Responser.send({ role: roles[0] });
  }

  public async updateRole(roleId: string, updateData: Partial<RoleData>, reply: FastifyReply): Promise<void> {
    if (!ObjectId.isValid(roleId)) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid role ID");
      return ErrorResponse.send({ error: "The provided role ID is not valid" });
    }

    const rolesCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.ROLES);
    const permissionsCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.PERMISSIONS);
    if (!rolesCol || !permissionsCol) {
      throw new Error("Database connection error.");
    }

    const existingRole = await rolesCol.findOne({ _id: new ObjectId(roleId) });
    if (!existingRole) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Role not found");
      return ErrorResponse.send({ error: `Role with ID "${roleId}" not found` });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedFields: Record<string, any> = {};

    if (updateData.name !== undefined) {
      const name = updateData.name.trim();
      if (!name) {
        const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid role name");
        return ErrorResponse.send({ error: "Role name cannot be empty" });
      }
      if (name !== existingRole.name) {
        const duplicateRole = await rolesCol.findOne({ name });
        if (duplicateRole) {
          const ErrorResponse = new BuildResponse(reply, StatusCodes.CONFLICT, "Role name already exists");
          return ErrorResponse.send({ error: `A role with the name "${name}" already exists` });
        }
      }
      updatedFields.name = name;
    }

    if (updateData.permissionCodes !== undefined) {
      if (!Array.isArray(updateData.permissionCodes) || updateData.permissionCodes.length === 0) {
        const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid permissions");
        return ErrorResponse.send({ error: "At least one permission is required" });
      }
      const matchedPermissions = await permissionsCol
        .find({ code: { $in: updateData.permissionCodes } })
        .toArray();
      if (matchedPermissions.length !== updateData.permissionCodes.length) {
        const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid permissions");
        return ErrorResponse.send({ error: "One or more permission codes are invalid" });
      }
      updatedFields.permissions = matchedPermissions.map(p => p._id);
    }

    await rolesCol.updateOne({ _id: new ObjectId(roleId) }, { $set: updatedFields });

    const roles = await rolesCol.aggregate([
      { $match: { _id: new ObjectId(roleId) } },
      {
        $lookup: {
          from: DB_DEFAULT_CONFIGS.Collections.PERMISSIONS,
          localField: "permissions",
          foreignField: "_id",
          as: "permissions",
        },
      },
    ]).toArray();

    const Responser = new BuildResponse(reply, StatusCodes.OK, "Role updated successfully");
    return Responser.send({ role: roles[0] });
  }

  public async deleteRole(roleId: string, reply: FastifyReply): Promise<void> {
    if (!ObjectId.isValid(roleId)) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Invalid role ID");
      return ErrorResponse.send({ error: "The provided role ID is not valid" });
    }

    const rolesCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.ROLES);
    const usersCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.USERS);
    if (!rolesCol || !usersCol) {
      throw new Error("Database connection error.");
    }

    const existingRole = await rolesCol.findOne({ _id: new ObjectId(roleId) });
    if (!existingRole) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Role not found");
      return ErrorResponse.send({ error: `Role with ID "${roleId}" not found` });
    }

    const assignedUserCount = await usersCol.countDocuments({ roleId: new ObjectId(roleId) });
    if (assignedUserCount > 0) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.CONFLICT, "Role is in use");
      return ErrorResponse.send({
        error: `Cannot delete role "${existingRole.name}" because it is assigned to ${assignedUserCount} user(s)`,
        assignedUserCount,
      });
    }

    await rolesCol.deleteOne({ _id: new ObjectId(roleId) });

    const Responser = new BuildResponse(reply, StatusCodes.OK, "Role deleted successfully");
    return Responser.send({ roleId, message: `Role "${existingRole.name}" has been deleted successfully` });
  }
}
