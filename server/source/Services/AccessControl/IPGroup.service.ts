import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { getCollectionClient } from "../../Database/mongodb.db";
import { ObjectId } from "mongodb";

export interface IPGroupData {
  name: string;
  description?: string;
  ipAddresses: string[];
  createdAt?: number;
  updatedAt?: number;
}

export default class IPGroupService {
  private readonly fastifyReply: FastifyReply;

  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  /**
   * Create a new IP group
   * @param {IPGroupData} groupData - The IP group data
   * @returns {Promise<void>}
   */
  public async createIPGroup(groupData: IPGroupData): Promise<void> {
    console.log("Creating new IP group:", groupData.name);

    // Validate group name
    if (!groupData.name || groupData.name.trim() === "") {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Invalid group name"
      );
      return ErrorResponse.send({
        error: "Group name is required"
      });
    }

    // Validate IP addresses
    if (!groupData.ipAddresses || groupData.ipAddresses.length === 0) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "IP addresses are required"
      );
      return ErrorResponse.send({
        error: "At least one IP address is required"
      });
    }

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.IP_GROUPS);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    // Check if group with same name already exists
    const existingGroup = await dbClient.findOne({ name: groupData.name });
    if (existingGroup) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.CONFLICT,
        "Group already exists"
      );
      return ErrorResponse.send({
        error: `An IP group with the name "${groupData.name}" already exists`
      });
    }

    // Create the group
    const newGroup = {
      ...groupData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const result = await dbClient.insertOne(newGroup);

    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.CREATED,
      "IP group created successfully"
    );

    return Responser.send({
      groupId: result.insertedId,
      group: newGroup,
      message: `IP group "${groupData.name}" has been created successfully`
    });
  }

  /**
   * Get all IP groups
   * @param {number} skip - Number of documents to skip
   * @param {number} limit - Maximum number of documents to return
   * @returns {Promise<void>}
   */
  public async getIPGroups(skip: number = 0, limit: number = 50): Promise<void> {
    console.log(`Fetching IP groups with skip: ${skip}, limit: ${limit}`);

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.IP_GROUPS);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    const total = await dbClient.countDocuments();
    const groups = await dbClient
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.OK,
      "IP groups fetched successfully"
    );

    return Responser.send({
      groups,
      total,
      skip,
      limit,
      message: `Found ${groups.length} IP groups`
    });
  }

  /**
   * Get a single IP group by ID
   * @param {string} groupId - The group ID
   * @returns {Promise<void>}
   */
  public async getIPGroupById(groupId: string): Promise<void> {
    console.log(`Fetching IP group with ID: ${groupId}`);

    if (!ObjectId.isValid(groupId)) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Invalid group ID"
      );
      return ErrorResponse.send({
        error: "The provided group ID is not valid"
      });
    }

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.IP_GROUPS);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    const group = await dbClient.findOne({ _id: new ObjectId(groupId) });

    if (!group) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.NOT_FOUND,
        "Group not found"
      );
      return ErrorResponse.send({
        error: `IP group with ID "${groupId}" not found`
      });
    }

    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.OK,
      "IP group fetched successfully"
    );

    return Responser.send({
      group,
      message: "Group retrieved successfully"
    });
  }

  /**
   * Update an IP group
   * @param {string} groupId - The group ID
   * @param {Partial<IPGroupData>} updateData - The data to update
   * @returns {Promise<void>}
   */
  public async updateIPGroup(groupId: string, updateData: Partial<IPGroupData>): Promise<void> {
    console.log(`Updating IP group with ID: ${groupId}`);

    if (!ObjectId.isValid(groupId)) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Invalid group ID"
      );
      return ErrorResponse.send({
        error: "The provided group ID is not valid"
      });
    }

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.IP_GROUPS);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    const existingGroup = await dbClient.findOne({ _id: new ObjectId(groupId) });
    if (!existingGroup) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.NOT_FOUND,
        "Group not found"
      );
      return ErrorResponse.send({
        error: `IP group with ID "${groupId}" not found`
      });
    }

    // If updating group name, check if it's already taken
    if (updateData.name && updateData.name !== existingGroup.name) {
      const duplicateGroup = await dbClient.findOne({ name: updateData.name });
      if (duplicateGroup) {
        const ErrorResponse = new BuildResponse(
          this.fastifyReply,
          StatusCodes.CONFLICT,
          "Group name already exists"
        );
        return ErrorResponse.send({
          error: `An IP group with the name "${updateData.name}" already exists`
        });
      }
    }

    // Update the group
    const updatedFields = {
      ...updateData,
      updatedAt: Date.now()
    };

    await dbClient.updateOne(
      { _id: new ObjectId(groupId) },
      { $set: updatedFields }
    );

    const updatedGroup = await dbClient.findOne({ _id: new ObjectId(groupId) });

    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.OK,
      "IP group updated successfully"
    );

    return Responser.send({
      group: updatedGroup,
      message: "Group updated successfully"
    });
  }

  /**
   * Delete an IP group
   * @param {string} groupId - The group ID
   * @returns {Promise<void>}
   */
  public async deleteIPGroup(groupId: string): Promise<void> {
    console.log(`Deleting IP group with ID: ${groupId}`);

    if (!ObjectId.isValid(groupId)) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Invalid group ID"
      );
      return ErrorResponse.send({
        error: "The provided group ID is not valid"
      });
    }

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.IP_GROUPS);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    const existingGroup = await dbClient.findOne({ _id: new ObjectId(groupId) });
    if (!existingGroup) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.NOT_FOUND,
        "Group not found"
      );
      return ErrorResponse.send({
        error: `IP group with ID "${groupId}" not found`
      });
    }

    // Check if this IP group is being used in any access control policies
    const policyClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ACCESS_CONTROL_POLICIES);
    if (!policyClient) {
      throw new Error("Database connection error.");
    }

    const groupObjectId = new ObjectId(groupId);
    const policiesUsingGroup = await policyClient.find({
      $or: [
        { targetIPGroup: groupObjectId },
        { targetIPGroups: groupObjectId }
      ]
    }).toArray();

    if (policiesUsingGroup.length > 0) {
      const policyNames = policiesUsingGroup.map(p => p.policyName).join(", ");
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.CONFLICT,
        "IP group is in use"
      );
      return ErrorResponse.send({
        error: `Cannot delete IP group "${existingGroup.name}" because it is being used in ${policiesUsingGroup.length} access control policy(ies): ${policyNames}`,
        policiesCount: policiesUsingGroup.length,
        policies: policiesUsingGroup.map(p => ({ id: p._id, name: p.policyName }))
      });
    }

    await dbClient.deleteOne({ _id: new ObjectId(groupId) });

    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.OK,
      "IP group deleted successfully"
    );

    return Responser.send({
      groupId,
      message: `IP group "${existingGroup.name}" has been deleted successfully`
    });
  }
}
