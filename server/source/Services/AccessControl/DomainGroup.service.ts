import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { getCollectionClient } from "../../Database/mongodb.db";
import { ObjectId } from "mongodb";

export interface DomainGroupData {
  name: string;
  description?: string;
  domains: string[];
  createdAt?: number;
  updatedAt?: number;
}

export default class DomainGroupService {
  private readonly fastifyReply: FastifyReply;

  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  /**
   * Create a new domain group
   * @param {DomainGroupData} groupData - The domain group data
   * @returns {Promise<void>}
   */
  public async createDomainGroup(groupData: DomainGroupData): Promise<void> {
    console.log("Creating new domain group:", groupData.name);

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

    // Validate domains
    if (!groupData.domains || groupData.domains.length === 0) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Domains are required"
      );
      return ErrorResponse.send({
        error: "At least one domain is required"
      });
    }

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS);
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
        error: `A domain group with the name "${groupData.name}" already exists`
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
      "Domain group created successfully"
    );

    return Responser.send({
      groupId: result.insertedId,
      group: newGroup,
      message: `Domain group "${groupData.name}" has been created successfully`
    });
  }

  /**
   * Get all domain groups
   * @param {number} skip - Number of documents to skip
   * @param {number} limit - Maximum number of documents to return
   * @returns {Promise<void>}
   */
  public async getDomainGroups(skip: number = 0, limit: number = 50): Promise<void> {
    console.log(`Fetching domain groups with skip: ${skip}, limit: ${limit}`);

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS);
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
      "Domain groups fetched successfully"
    );

    return Responser.send({
      groups,
      total,
      skip,
      limit,
      message: `Found ${groups.length} domain groups`
    });
  }

  /**
   * Get a single domain group by ID
   * @param {string} groupId - The group ID
   * @returns {Promise<void>}
   */
  public async getDomainGroupById(groupId: string): Promise<void> {
    console.log(`Fetching domain group with ID: ${groupId}`);

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

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS);
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
        error: `Domain group with ID "${groupId}" not found`
      });
    }

    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.OK,
      "Domain group fetched successfully"
    );

    return Responser.send({
      group,
      message: "Group retrieved successfully"
    });
  }

  /**
   * Update a domain group
   * @param {string} groupId - The group ID
   * @param {Partial<DomainGroupData>} updateData - The data to update
   * @returns {Promise<void>}
   */
  public async updateDomainGroup(groupId: string, updateData: Partial<DomainGroupData>): Promise<void> {
    console.log(`Updating domain group with ID: ${groupId}`);

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

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS);
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
        error: `Domain group with ID "${groupId}" not found`
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
          error: `A domain group with the name "${updateData.name}" already exists`
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
      "Domain group updated successfully"
    );

    return Responser.send({
      group: updatedGroup,
      message: "Group updated successfully"
    });
  }

  /**
   * Delete a domain group
   * @param {string} groupId - The group ID
   * @returns {Promise<void>}
   */
  public async deleteDomainGroup(groupId: string): Promise<void> {
    console.log(`Deleting domain group with ID: ${groupId}`);

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

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS);
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
        error: `Domain group with ID "${groupId}" not found`
      });
    }

    // Check if this domain group is being used in any access control policies
    const policyClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ACCESS_CONTROL_POLICIES);
    if (!policyClient) {
      throw new Error("Database connection error.");
    }

    const groupObjectId = new ObjectId(groupId);
    const policiesUsingGroup = await policyClient.find({
      $or: [
        { domainGroup: groupObjectId },
        { domainGroups: groupObjectId }
      ]
    }).toArray();

    if (policiesUsingGroup.length > 0) {
      const policyNames = policiesUsingGroup.map(p => p.policyName).join(", ");
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.CONFLICT,
        "Domain group is in use"
      );
      return ErrorResponse.send({
        error: `Cannot delete domain group "${existingGroup.name}" because it is being used in ${policiesUsingGroup.length} access control policy(ies): ${policyNames}`,
        policiesCount: policiesUsingGroup.length,
        policies: policiesUsingGroup.map(p => ({ id: p._id, name: p.policyName }))
      });
    }

    await dbClient.deleteOne({ _id: new ObjectId(groupId) });

    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.OK,
      "Domain group deleted successfully"
    );

    return Responser.send({
      groupId,
      message: `Domain group "${existingGroup.name}" has been deleted successfully`
    });
  }
}
