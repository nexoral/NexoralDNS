import { FastifyReply, FastifyRequest } from "fastify";
import LoginService from "../../Services/Auth/Login.service";
import ChangePasswordService from "../../Services/Auth/ChangePassword.service";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";


type LoginRequestBody = {
  username: string;
  password: string;
};

type ChangePasswordRequestBody = {
  currentPassword: string;
  newPassword: string;
};

/**
 * AuthController handles authentication-related requests.
 * It provides methods for user login and other auth functionalities.
 * @class
 * @method login - Handles user login requests.
 * @method changePassword - Handles user password change requests.
 * @param {FastifyRequest} request - The Fastify request object.
 * @param {FastifyReply} reply - The Fastify reply object for sending responses.
 * @returns {Promise<void>} - A promise that resolves when the process is complete.
 */
export default class AuthController {
  constructor() { }

  public static async login(
    request: FastifyRequest<{ Body: LoginRequestBody }>,
    reply: FastifyReply
  ): Promise<void> {
    // construct Response
    const Responser = new BuildResponse(reply, StatusCodes.UNAUTHORIZED, "Login failed");
    const { username, password } = request.body;

    if (!request.body || !username || !password) {
      Responser.send({ message: "Username and password are required" });
      return;
    }

    // Initialize LoginService
    const loginService = new LoginService(reply);

    try {
      return loginService.login(username, password);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async changePassword(
    request: FastifyRequest<{ Body: ChangePasswordRequestBody }>,
    reply: FastifyReply
  ): Promise<void> {
    // construct Response
    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Password change failed");
    const { currentPassword, newPassword } = request.body;

    if (!request.body || !currentPassword || !newPassword) {
      Responser.send({ message: "Current password and new password are required" });
      return;
    }

    // Get user from request (populated by authGuard middleware)
    const user = (request as any).user;
    if (!user || !user._id) {
      return Responser.send({ message: "Unauthorized" }, StatusCodes.UNAUTHORIZED, "Unauthorized");
    }

    // Initialize ChangePasswordService
    const changePasswordService = new ChangePasswordService(reply);

    try {
      return changePasswordService.changePassword(user._id, currentPassword, newPassword);
    } catch (error) {
      return Responser.send(error);
    }
  }
}