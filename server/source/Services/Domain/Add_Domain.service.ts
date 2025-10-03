import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";


// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";
// db connections
import { getCollectionClient } from "../../Database/mongodb.db";


export default class DomainAddService {
  private readonly fastifyReply: FastifyReply
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  // Add a new domain record
}