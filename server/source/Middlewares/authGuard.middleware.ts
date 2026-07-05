import { FastifyReply, FastifyRequest } from "fastify";
import ResponseBuilder from "../helper/responseBuilder.helper";
import { StatusCodes } from "outers";
import { verifyToken } from "../helper/jwt.helper";
import container from "../container/appContainer";

export interface authGuardFastifyRequest extends FastifyRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

export class authGuard {
  public static async isAuthenticated(
    fastifyRequest: authGuardFastifyRequest,
    fastifyReply: FastifyReply
  ): Promise<void> {
    const responser = new ResponseBuilder(fastifyReply, StatusCodes.UNAUTHORIZED, "Unauthorized access");

    const tokenExtractor = container.get('TokenExtractor');
    const sessionStore = container.get('SessionStore');

    const token = tokenExtractor.extract(fastifyRequest);

    if (!token) {
      return responser.send(
        'Unauthorized, please provide a valid token',
        StatusCodes.UNAUTHORIZED
      );
    }

    const decoded = verifyToken(token);
    if (!decoded.valid) {
      return responser.send(
        'Unauthorized, token is invalid or expired',
        StatusCodes.UNAUTHORIZED
      );
    }

    const session = await sessionStore.getSession(token);
    if (!session || !session.isLoggedIn) {
      return responser.send(
        'Session expired or logged out, please login again',
        StatusCodes.UNAUTHORIZED
      );
    }

    fastifyRequest.user = decoded.data;
  }
}
