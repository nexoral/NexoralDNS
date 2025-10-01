import { FastifyReply, FastifyRequest } from "fastify";
import ResponseBuilder from "../helper/responseBuilder.helper";
import { StatusCodes, ClassBased } from "outers";

// Extend FastifyRequest to include user property
  interface authGuardFastifyRequest extends FastifyRequest {
    user?: any;
  }

export default class authGuard {
  constructor() {}

  /**
   * Middleware function to verify if a request is authenticated.
   * 
   * This method checks for a valid authentication token in the request headers or query parameters.
   * The token can be provided in any of the following ways:
   * - In headers with key 'authorization'
   * - In headers with key 'auth_token'
   * - As a query parameter with key 'auth_token'
   * 
   * If the token is missing or invalid, it responds with an unauthorized status.
   * If the token is valid, it allows the request to proceed to the next middleware or route handler.
   * 
   * @param {FastifyRequest} fastifyRequest - The Fastify request object
   * @param {FastifyReply} fastifyReply - The Fastify reply object
   * @param {() => void} [done] - Optional callback to be executed if authentication succeeds
   * @returns {void}
   */
  public static isAuthenticated(fastifyRequest: authGuardFastifyRequest, fastifyReply: FastifyReply, done?: () => void): void {
    const responser = new ResponseBuilder(fastifyReply);
    const token = fastifyRequest.headers['authorization'] || fastifyRequest.headers['auth_token'] || (fastifyRequest.query as Record<string, string>)['auth_token'];
    if (!token) {
      return responser.send('Unauthorized, please provide a valid token on headers with any of the keys: authorization, auth_token or as query parameter with key auth_token', StatusCodes.UNAUTHORIZED);
    }

    // Verify token (placeholder logic)
    const JWT_MANAGER = new ClassBased.JWT_Manager(process.arch)
    const decodedInfo = JWT_MANAGER.decode(token as string);

    if(decodedInfo.data){
      fastifyRequest.user = decodedInfo?.data?.data;
    }
    else {
      fastifyRequest.user = null;
    }
    
    if (decodedInfo.status !== "Success") {
      return responser.send('Unauthorized, please provide a valid token on headers with any of the keys: authorization, auth_token or as query parameter with key auth_token', StatusCodes.UNAUTHORIZED);
    }

    // If everything is fine, proceed to the next middleware or route handler
    if (done) {
      done();
    }
    return;
  }
}