import { FastifyReply, FastifyRequest } from "fastify";
import ResponseBuilder from "../helper/responseBuilder.helper";
import { StatusCodes } from "outers";
import { verifyToken } from "../helper/jwt.helper";
import { getCollectionClient } from "../Database/mongodb.db";
import { DB_DEFAULT_CONFIGS } from "../core/key";
import RedisCache from "../Redis/Redis.cache";

export interface authGuardFastifyRequest extends FastifyRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

export default class authGuard {
  constructor() {}

  public static async isAuthenticated(
    fastifyRequest: authGuardFastifyRequest,
    fastifyReply: FastifyReply
  ): Promise<void> {
    const responser = new ResponseBuilder(fastifyReply, StatusCodes.UNAUTHORIZED, "Unauthorized access");

    // Read from httpOnly cookie (primary) or Authorization header (fallback)
    const cookies = (fastifyRequest as unknown as { cookies: Record<string, string> }).cookies;
    const token: string | undefined =
      cookies?.access_token ||
      (fastifyRequest.headers['authorization'] as string | undefined);

    if (!token) {
      return responser.send(
        'Unauthorized, please provide a valid token',
        StatusCodes.UNAUTHORIZED
      );
    }

    
    // Verify JWT signature and expiry
    const decoded = verifyToken(token);
    if (!decoded.valid) {
      return responser.send(
        'Unauthorized, token is invalid or expired',
        StatusCodes.UNAUTHORIZED
      );
    }
    
    let session;

    // check  Redis have the token or not
    const redisTokenData = await RedisCache.get(`session:${token}`)
    if (redisTokenData) {
      session = redisTokenData;
    }
    else {
      // Verify session exists in DB and is active
      const sessionCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SESSION_MANAGE);
      if (!sessionCol) {
        return responser.send('Database connection error', StatusCodes.INTERNAL_SERVER_ERROR);
      }

      session = await sessionCol.findOne({ accessToken: token });

      // Store to  Redis
      if (session){
        await RedisCache.set(`session:${token}`, session, 1800)
      }
    }
    if (!session || !session.isLoggedIn) {
      return responser.send(
        'Session expired or logged out, please login again',
        StatusCodes.UNAUTHORIZED
      );
    }

    fastifyRequest.user = decoded.data;
  }
}
