import container from '../../container/appContainer';
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import { ObjectId } from "mongodb";
import BuildResponse from "../../helper/responseBuilder.helper";
import { DB_DEFAULT_CONFIGS } from "../../core/key";

export interface SessionUserPayload {
  _id: string;
  username: string;
  roleId: string;
  passwordUpdatedAt: Date | null;
}

export default class VerifySessionService {
  private readonly fastifyReply: FastifyReply;

  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  /**
   * Re-populates role name, permission objects, and profile fields (createdAt,
   * isActive) on session restore, mirroring Login.service.ts's aggregation and
   * response shape exactly so authStore.login() (which expects
   * `{ user: {id, username, passwordUpdatedAt, createdAt, isActive}, role: {id, name, permissions} }`)
   * stays correctly hydrated on every dashboard page load, not just a fresh login.
   */
  public async verify(userPayload: SessionUserPayload): Promise<void> {
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Session valid");

    if (!userPayload?._id) {
      return Responser.send({
        user: { id: userPayload?._id, username: userPayload?.username, passwordUpdatedAt: userPayload?.passwordUpdatedAt ?? null },
        role: null,
      });
    }

    const usersCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.USERS);
    if (!usersCol) {
      throw new Error("Database connection error.");
    }

    const results = await usersCol.aggregate([
      { $match: { _id: new ObjectId(userPayload._id) } },
      {
        $lookup: {
          from: DB_DEFAULT_CONFIGS.Collections.ROLES,
          localField: "roleId",
          foreignField: "_id",
          as: "role",
        },
      },
      { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: DB_DEFAULT_CONFIGS.Collections.PERMISSIONS,
          localField: "role.permissions",
          foreignField: "_id",
          as: "permissions",
        },
      },
      { $project: { password: 0 } },
    ]).toArray();

    const userDetails = results[0];

    if (!userDetails) {
      return Responser.send(
        { message: "User not found" },
        StatusCodes.UNAUTHORIZED,
        "Session invalid"
      );
    }

    return Responser.send({
      user: {
        id: userDetails._id,
        username: userDetails.username,
        passwordUpdatedAt: userDetails.passwordUpdatedAt ?? null,
        createdAt: userDetails.createdAt,
        isActive: userDetails.isActive !== false,
      },
      role: userDetails.role ? { id: userDetails.role._id, name: userDetails.role.name, permissions: userDetails.permissions } : null,
    });
  }
}
