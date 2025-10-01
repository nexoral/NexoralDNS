import { FastifyReply, FastifyRequest } from "fastify";
import LoginService from "../../Services/Auth/Login.service";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";


type LoginRequestBody = {
  username: string;
  password: string;
};

/**
 * AuthController handles authentication-related requests.
 * It provides methods for user login and other auth functionalities.
 * @class
 * @method login - Handles user login requests.
 * @param {FastifyRequest} request - The Fastify request object.
 * @param {FastifyReply} reply - The Fastify reply object for sending responses.
 * @returns {Promise<void>} - A promise that resolves when the login process is complete.
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

    return loginService.login(username, password);
  }
}