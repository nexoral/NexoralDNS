import { FastifyReply, FastifyRequest } from "fastify";

// Import Database or any other necessary modules here
import {getCollectionClient} from "../Database/mongodb.db"
import { DB_DEFAULT_CONFIGS } from "../core/key";

import ResponseBuilder from "../helper/responseBuilder.helper";
// Interface for FastifyRequest with user property
import { authGuardFastifyRequest } from "./authGuard.middleware";
import { StatusCodes } from "outers";
import {ObjectId } from "mongodb";


export default class PermissionGuard {
  constructor() {
  }

  public static canAccess (...perMissionCode: number[]){
    return async (request: authGuardFastifyRequest, reply: FastifyReply, done: () => void) => {
      const { user } = request;
      const responser = new ResponseBuilder(reply, StatusCodes.FORBIDDEN, "Forbidden");
      if (!user) {
        return responser.send("Forbidden, user information is missing. Please ensure you are authenticated.", StatusCodes.FORBIDDEN);
      }

      const roleCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ROLES);
      const userCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.USERS);
      const permissionCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.PERMISSIONS);

      if (!userCollection || !roleCollection || !permissionCollection) {
        return responser.send("Database connection error", StatusCodes.INTERNAL_SERVER_ERROR);
      }

      // Fetch user with role information
      const userDetails = await userCollection.findOne({ _id: new ObjectId(user._id) });
      if (!userDetails || !userDetails.roleId) {
        return responser.send("User role not found", StatusCodes.FORBIDDEN);
      }

      // Fetch role with permissions
      const role = await roleCollection.findOne({ _id: new ObjectId(userDetails.roleId) });
      if (!role || !role.permissions) {
        return responser.send("Role permissions not found", StatusCodes.FORBIDDEN);
      }

      // Fetch all permission documents for this role
      const userPermissions = await permissionCollection.find({
        _id: { $in: role.permissions }
      }).toArray();

      const userPermissionCodes: number[] = userPermissions.map(p => p.code);

      // // Check if user has "Full Access" permission (code 4)
      if (userPermissionCodes.includes(4)) {
        if (done) {
          done();
        }
        return;
      }

      // Check if user has at least one of the required permissions
      const hasPermission = perMissionCode.some(reqPerm =>
        userPermissionCodes.includes(reqPerm)
      );

      if (!hasPermission) {
        return responser.send(
          `Access denied. Required permissions: ${perMissionCode.join(", ")}`,
          StatusCodes.FORBIDDEN
        );
      }


      // If everything is fine, proceed to the next middleware or route handler
      if (done) {
        done();
      }
      return;
    }
  }
}