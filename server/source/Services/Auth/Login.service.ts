import { FastifyReply } from "fastify";
import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes, ClassBased } from "outers";

// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";
// db connections
import { getCollectionClient } from "../../Database/mongodb.db";
import Bcrypt from "../../helper/bcrypt.helper";

/**
 * LoginService handles user authentication.
 * It verifies user credentials and generates authentication tokens.
 * Currently, it contains placeholder logic for demonstration purposes.
 * In a real application, replace the placeholder logic with actual authentication mechanisms.
 * @class
 * @param {FastifyReply} reply - The Fastify reply object for sending responses.
 * @method login - Authenticates a user and returns a token.
 * @returns {Promise<void>} - A promise that resolves when the login process is complete.
 */
export default class LoginService {
  private readonly fastifyReply: FastifyReply
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  public async login(username: string, password: string): Promise<void> {
    // construct Response
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Login successful");
    const usersCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.USERS);
    if (!usersCol) {
      return Responser.send("Database connection error", StatusCodes.INTERNAL_SERVER_ERROR, "Database Error");
    }

    const user = await usersCol.findOne({username: username});
    if (!user) {
      return Responser.send("Invalid username or password", StatusCodes.UNAUTHORIZED, "Authentication Failed");
    }

    const isPasswordValid = await new Bcrypt().Compare(password, user.password);
    if (!isPasswordValid) {
      return Responser.send("Invalid username or password", StatusCodes.UNAUTHORIZED, "Authentication Failed");
    }

    // get all user details except password
    delete user.password;

    // get user all details with role and permissions
    const userDetails = { ...user };
    const fullDetails = await usersCol.aggregate([
      {
        $match: { _id: user._id }
      },
      {
        $lookup: {
          from: DB_DEFAULT_CONFIGS.Collections.ROLES,
          localField: "roleId",
          foreignField: "_id",
          as: "role"
        }
      },
      {
        $unwind: "$role"
      },
      {
        $lookup: {
          from: DB_DEFAULT_CONFIGS.Collections.PERMISSIONS,
          localField: "role.permissions",
          foreignField: "_id",
          as: "permissions"
        }
      },
      {
        $project: {
          password: 0 // Exclude password field
        }
      }
    ]).toArray();

    // merge userDetails with fullDetails
    if (fullDetails.length > 0) {
      Object.assign(userDetails, fullDetails[0]);
    }

    // generate JWT token (placeholder logic)
    const JWT_MANAGER = new ClassBased.JWT_Manager(process.arch);
    const token = JWT_MANAGER.generate(userDetails, "7d"); // token valid for 7 days
    
    if (!token.toKen) {
      return Responser.send("Failed to generate token", StatusCodes.INTERNAL_SERVER_ERROR, "Token Generation Failed");
    }

    return Responser.send({
      token: token.toKen,
      user: {
        id: userDetails._id,
        username: username
      }
    });
  }
}