import { FastifyReply } from "fastify";
import ResponseBuilder from "../helper/responseBuilder.helper";
import { authGuardFastifyRequest } from "./authGuard.middleware";
import { StatusCodes } from "outers";

const FULL_ACCESS_PERMISSION_CODE = 4;

export default class PermissionGuard {
  constructor() {}

  public static canAccess(...permissionCodes: number[]) {
    return async (request: authGuardFastifyRequest, reply: FastifyReply, done: () => void) => {
      const { user } = request;
      const responser = new ResponseBuilder(reply, StatusCodes.FORBIDDEN, "Forbidden");

      if (!user) {
        return responser.send(
          "Forbidden, user information is missing. Please ensure you are authenticated.",
          StatusCodes.FORBIDDEN
        );
      }

      const userPermissionCodes: number[] = Array.isArray(user.permissionCodes)
        ? (user.permissionCodes as number[])
        : [];

      if (userPermissionCodes.includes(FULL_ACCESS_PERMISSION_CODE)) {
        if (done) done();
        return;
      }

      const hasPermission = permissionCodes.some(code => userPermissionCodes.includes(code));
      if (!hasPermission) {
        return responser.send(
          `Access denied. Required permissions: ${permissionCodes.join(", ")}`,
          StatusCodes.FORBIDDEN
        );
      }

      if (done) done();
    };
  }
}
