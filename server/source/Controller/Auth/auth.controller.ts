import { FastifyReply, FastifyRequest } from "fastify";
import LoginService from "../../Services/Auth/Login.service";
import ChangePasswordService from "../../Services/Auth/ChangePassword.service";
import LogoutService from "../../Services/Auth/Logout.service";
import RefreshTokenService from "../../Services/Auth/RefreshToken.service";
import VerifySessionService from "../../Services/Auth/VerifySession.service";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import container from '../../container/appContainer';

type LoginRequestBody = {
  username: string;
  password: string;
};

type ChangePasswordRequestBody = {
  currentPassword: string;
  newPassword: string;
};

export default class AuthController {
  constructor() {}

  public static async login(
    request: FastifyRequest<{ Body: LoginRequestBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.UNAUTHORIZED, "Login failed");
    const { username, password } = request.body;

    if (!request.body || !username || !password) {
      Responser.send({ message: "Username and password are required" });
      return;
    }

    try {
      return container.get<LoginService>('LoginService').login(username, password, reply);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async changePassword(
    request: FastifyRequest<{ Body: ChangePasswordRequestBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Password change failed");
    const { currentPassword, newPassword } = request.body;

    if (!request.body || !currentPassword || !newPassword) {
      Responser.send({ message: "Current password and new password are required" });
      return;
    }

    const user = (request as unknown as { user: Record<string, unknown> }).user;
    if (!user || !user._id) {
      return Responser.send({ message: "Unauthorized" }, StatusCodes.UNAUTHORIZED, "Unauthorized");
    }

    try {
      return container.get<ChangePasswordService>('ChangePasswordService').changePassword(user._id as string, currentPassword, newPassword, reply);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async logout(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.UNAUTHORIZED, "Logout failed");
    const cookies = (request as unknown as { cookies: Record<string, string> }).cookies;
    const accessToken = cookies?.access_token;

    if (!accessToken) {
      return Responser.send("No active session found", StatusCodes.UNAUTHORIZED, "Unauthorized");
    }

    try {
      return container.get<LogoutService>('LogoutService').logout(accessToken, reply);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async refreshToken(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.UNAUTHORIZED, "Token refresh failed");
    const cookies = (request as unknown as { cookies: Record<string, string> }).cookies;
    const refreshToken = cookies?.refresh_token;

    if (!refreshToken) {
      return Responser.send("No refresh token found", StatusCodes.UNAUTHORIZED, "Unauthorized");
    }

    try {
      return container.get<RefreshTokenService>('RefreshTokenService').refresh(refreshToken, reply);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async verifySession(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.UNAUTHORIZED, "Session invalid");
    const user = (request as unknown as { user: Record<string, unknown> }).user;

    if (!user) {
      return Responser.send({ message: "Unauthorized" }, StatusCodes.UNAUTHORIZED, "Unauthorized");
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return container.get<VerifySessionService>('VerifySessionService').verify(user as any, reply);
    } catch (error) {
      return Responser.send(error);
    }
  }
}
