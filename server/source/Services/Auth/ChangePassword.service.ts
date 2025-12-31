import { FastifyReply } from "fastify";
import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";
import { ObjectId } from "mongodb";

// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";
// db connections
import { getCollectionClient } from "../../Database/mongodb.db";
import Bcrypt from "../../helper/bcrypt.helper";

/**
 * ChangePasswordService handles user password change functionality.
 * It verifies the current password and updates the user's password.
 * @class
 * @param {FastifyReply} reply - The Fastify reply object for sending responses.
 * @method changePassword - Changes the user's password after verifying the current password.
 * @returns {Promise<void>} - A promise that resolves when the password change process is complete.
 */
export default class ChangePasswordService {
  private readonly fastifyReply: FastifyReply
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  public async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // construct Response
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Password changed successfully");
    const usersCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.USERS);

    if (!usersCol) {
      return Responser.send("Database connection error", StatusCodes.INTERNAL_SERVER_ERROR, "Database Error");
    }

    // Find user by ID
    const user = await usersCol.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return Responser.send("User not found", StatusCodes.NOT_FOUND, "User Not Found");
    }

    // Verify current password
    const isPasswordValid = await new Bcrypt().Compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return Responser.send("Current password is incorrect", StatusCodes.UNAUTHORIZED, "Invalid Password");
    }

    // Validate new password
    if (newPassword.length < 6) {
      return Responser.send("New password must be at least 6 characters long", StatusCodes.BAD_REQUEST, "Invalid Password");
    }

    // Check if new password is same as current password
    const isSamePassword = await new Bcrypt().Compare(newPassword, user.password);
    if (isSamePassword) {
      return Responser.send("New password cannot be the same as the current password", StatusCodes.BAD_REQUEST, "Invalid Password");
    }

    // Hash new password
    const hashedPassword = await new Bcrypt().Encrypt(newPassword);

    // Update password and passwordUpdatedAt
    const updateResult = await usersCol.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          password: hashedPassword,
          passwordUpdatedAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return Responser.send("Failed to update password", StatusCodes.INTERNAL_SERVER_ERROR, "Update Failed");
    }

    return Responser.send({
      message: "Password changed successfully",
      passwordUpdatedAt: new Date()
    });
  }
}
