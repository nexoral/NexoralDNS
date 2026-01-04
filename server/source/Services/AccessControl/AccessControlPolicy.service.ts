import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { getCollectionClient } from "../../Database/mongodb.db";
import { ObjectId } from "mongodb";
import { forceReloadACLPolicies } from "../../CronJob/Jobs/LoadPolicies.cron";

export interface DomainEntry {
  domain: string;
  isWildcard: boolean;
}

export interface AccessControlPolicyData {
  policyType: string;
  targetType: string;
  targetIP?: string;
  targetIPs?: string[]; // Support multiple IPs
  targetIPGroup?: ObjectId | string; // ObjectId reference to IP Group
  targetIPGroups?: (ObjectId | string)[]; // Support multiple IP Groups
  blockType: string;
  domains?: DomainEntry[];
  domainGroup?: ObjectId | string; // ObjectId reference to Domain Group
  domainGroups?: (ObjectId | string)[]; // Support multiple Domain Groups
  policyName: string;
  isActive: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export default class AccessControlPolicyService {
  private readonly fastifyReply: FastifyReply;

  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  /**
   * Create a new access control policy
   * @param {AccessControlPolicyData} policyData - The policy data
   * @returns {Promise<void>}
   */
  public async createPolicy(policyData: AccessControlPolicyData): Promise<void> {
    console.log("Creating new access control policy:", policyData.policyName);

    // Validate policy name
    if (!policyData.policyName || policyData.policyName.trim() === "") {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Invalid policy name"
      );
      return ErrorResponse.send({
        error: "Policy name is required"
      });
    }

    // Validate policy type
    const validPolicyTypes = ["user_domain", "user_internet", "domain_all", "domain_user", "group_based"];
    if (!validPolicyTypes.includes(policyData.policyType)) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Invalid policy type"
      );
      return ErrorResponse.send({
        error: "Policy type must be one of: user_domain, user_internet, domain_all, domain_user, group_based"
      });
    }

    // Validate target type
    const validTargetTypes = ["single_ip", "multiple_ips", "ip_group", "multiple_ip_groups", "all"];
    if (!validTargetTypes.includes(policyData.targetType)) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Invalid target type"
      );
      return ErrorResponse.send({
        error: "Target type must be one of: single_ip, multiple_ips, ip_group, multiple_ip_groups, all"
      });
    }

    // Validate target IP if targetType is single_ip
    if (policyData.targetType === "single_ip" && (!policyData.targetIP || policyData.targetIP.trim() === "")) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Target IP is required"
      );
      return ErrorResponse.send({
        error: "Target IP is required when target type is single_ip"
      });
    }

    // Validate target IPs if targetType is multiple_ips
    if (policyData.targetType === "multiple_ips" && (!policyData.targetIPs || policyData.targetIPs.length === 0)) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Target IPs are required"
      );
      return ErrorResponse.send({
        error: "At least one IP is required when target type is multiple_ips"
      });
    }

    // Validate target IP group if targetType is ip_group
    if (policyData.targetType === "ip_group" && !policyData.targetIPGroup) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Target IP group is required"
      );
      return ErrorResponse.send({
        error: "Target IP group is required when target type is ip_group"
      });
    }

    // Validate target IP groups if targetType is multiple_ip_groups
    if (policyData.targetType === "multiple_ip_groups" && (!policyData.targetIPGroups || policyData.targetIPGroups.length === 0)) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Target IP groups are required"
      );
      return ErrorResponse.send({
        error: "At least one IP group is required when target type is multiple_ip_groups"
      });
    }

    // Validate block type
    const validBlockTypes = ["specific_domains", "domain_group", "multiple_domain_groups", "full_internet"];
    if (!validBlockTypes.includes(policyData.blockType)) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Invalid block type"
      );
      return ErrorResponse.send({
        error: "Block type must be one of: specific_domains, domain_group, multiple_domain_groups, full_internet"
      });
    }

    // Validate domains if blockType is specific_domains
    if (policyData.blockType === "specific_domains" && (!policyData.domains || policyData.domains.length === 0)) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Domains are required"
      );
      return ErrorResponse.send({
        error: "At least one domain is required when block type is specific_domains"
      });
    }

    // Validate domain group if blockType is domain_group
    if (policyData.blockType === "domain_group" && !policyData.domainGroup) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Domain group is required"
      );
      return ErrorResponse.send({
        error: "Domain group is required when block type is domain_group"
      });
    }

    // Validate domain groups if blockType is multiple_domain_groups
    if (policyData.blockType === "multiple_domain_groups" && (!policyData.domainGroups || policyData.domainGroups.length === 0)) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Domain groups are required"
      );
      return ErrorResponse.send({
        error: "At least one domain group is required when block type is multiple_domain_groups"
      });
    }

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ACCESS_CONTROL_POLICIES);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    // Check if policy with same name already exists
    const existingPolicy = await dbClient.findOne({ policyName: policyData.policyName });
    if (existingPolicy) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.CONFLICT,
        "Policy already exists"
      );
      return ErrorResponse.send({
        error: `A policy with the name "${policyData.policyName}" already exists`
      });
    }

    // Convert string IDs to ObjectIds for references
    const newPolicy: any = {
      ...policyData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Convert targetIPGroup to ObjectId if it exists
    if (newPolicy.targetIPGroup) {
      if (!ObjectId.isValid(newPolicy.targetIPGroup)) {
        const ErrorResponse = new BuildResponse(
          this.fastifyReply,
          StatusCodes.BAD_REQUEST,
          "Invalid IP group ID"
        );
        return ErrorResponse.send({
          error: "Invalid IP group ID format"
        });
      }
      newPolicy.targetIPGroup = new ObjectId(newPolicy.targetIPGroup);
    }

    // Convert targetIPGroups array to ObjectIds if it exists
    if (newPolicy.targetIPGroups && Array.isArray(newPolicy.targetIPGroups)) {
      for (const id of newPolicy.targetIPGroups) {
        if (!ObjectId.isValid(id)) {
          const ErrorResponse = new BuildResponse(
            this.fastifyReply,
            StatusCodes.BAD_REQUEST,
            "Invalid IP group IDs"
          );
          return ErrorResponse.send({
            error: `Invalid IP group ID format: ${id}`
          });
        }
      }
      newPolicy.targetIPGroups = newPolicy.targetIPGroups.map((id: string) => new ObjectId(id));
    }

    // Convert domainGroup to ObjectId if it exists
    if (newPolicy.domainGroup) {
      if (!ObjectId.isValid(newPolicy.domainGroup)) {
        const ErrorResponse = new BuildResponse(
          this.fastifyReply,
          StatusCodes.BAD_REQUEST,
          "Invalid domain group ID"
        );
        return ErrorResponse.send({
          error: "Invalid domain group ID format"
        });
      }
      newPolicy.domainGroup = new ObjectId(newPolicy.domainGroup);
    }

    // Convert domainGroups array to ObjectIds if it exists
    if (newPolicy.domainGroups && Array.isArray(newPolicy.domainGroups)) {
      for (const id of newPolicy.domainGroups) {
        if (!ObjectId.isValid(id)) {
          const ErrorResponse = new BuildResponse(
            this.fastifyReply,
            StatusCodes.BAD_REQUEST,
            "Invalid domain group IDs"
          );
          return ErrorResponse.send({
            error: `Invalid domain group ID format: ${id}`
          });
        }
      }
      newPolicy.domainGroups = newPolicy.domainGroups.map((id: string) => new ObjectId(id));
    }

    const result = await dbClient.insertOne(newPolicy);

    // Immediately reload ACL policies to Redis
    // Note: In-memory caches in BlockList will expire after 5 seconds
    try {
      await forceReloadACLPolicies();
      console.log('[ACL] Policies reloaded to Redis after policy creation');
    } catch (error) {
      console.error('[ACL] Failed to reload policies after create:', error);
      // Don't fail the request if Redis reload fails
    }

    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.CREATED,
      "Access control policy created successfully"
    );

    return Responser.send({
      policyId: result.insertedId,
      policy: newPolicy,
      message: `Policy "${policyData.policyName}" has been created successfully`
    });
  }

  /**
   * Get all access control policies with optional filtering
   * @param {string} filter - Filter type (all, active, inactive, or policy type)
   * @param {number} skip - Number of documents to skip
   * @param {number} limit - Maximum number of documents to return
   * @returns {Promise<void>}
   */
  public async getPolicies(filter: string = "all", skip: number = 0, limit: number = 50): Promise<void> {
    console.log(`Fetching access control policies with filter: ${filter}, skip: ${skip}, limit: ${limit}`);

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ACCESS_CONTROL_POLICIES);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    // Build the query based on filter
    let query: any = {};

    if (filter === "active") {
      query.isActive = true;
    } else if (filter === "inactive") {
      query.isActive = false;
    } else if (filter !== "all") {
      // Check if filter is a policy type
      const validPolicyTypes = ["user_domain", "user_internet", "domain_all", "domain_user", "group_based"];
      if (validPolicyTypes.includes(filter)) {
        query.policyType = filter;
      }
    }

    const total = await dbClient.countDocuments(query);
    const policies = await dbClient
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.OK,
      "Access control policies fetched successfully"
    );

    return Responser.send({
      policies,
      total,
      skip,
      limit,
      filter,
      message: `Found ${policies.length} policies`
    });
  }

  /**
   * Get a single access control policy by ID
   * @param {string} policyId - The policy ID
   * @returns {Promise<void>}
   */
  public async getPolicyById(policyId: string): Promise<void> {
    console.log(`Fetching access control policy with ID: ${policyId}`);

    if (!ObjectId.isValid(policyId)) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Invalid policy ID"
      );
      return ErrorResponse.send({
        error: "The provided policy ID is not valid"
      });
    }

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ACCESS_CONTROL_POLICIES);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    const policy = await dbClient.findOne({ _id: new ObjectId(policyId) });

    if (!policy) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.NOT_FOUND,
        "Policy not found"
      );
      return ErrorResponse.send({
        error: `Policy with ID "${policyId}" not found`
      });
    }

    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.OK,
      "Access control policy fetched successfully"
    );

    return Responser.send({
      policy,
      message: "Policy retrieved successfully"
    });
  }

  /**
   * Update an access control policy
   * @param {string} policyId - The policy ID
   * @param {Partial<AccessControlPolicyData>} updateData - The data to update
   * @returns {Promise<void>}
   */
  public async updatePolicy(policyId: string, updateData: Partial<AccessControlPolicyData>): Promise<void> {
    console.log(`Updating access control policy with ID: ${policyId}`);

    if (!ObjectId.isValid(policyId)) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Invalid policy ID"
      );
      return ErrorResponse.send({
        error: "The provided policy ID is not valid"
      });
    }

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ACCESS_CONTROL_POLICIES);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    const existingPolicy = await dbClient.findOne({ _id: new ObjectId(policyId) });
    if (!existingPolicy) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.NOT_FOUND,
        "Policy not found"
      );
      return ErrorResponse.send({
        error: `Policy with ID "${policyId}" not found`
      });
    }

    // If updating policy name, check if it's already taken
    if (updateData.policyName && updateData.policyName !== existingPolicy.policyName) {
      const duplicatePolicy = await dbClient.findOne({ policyName: updateData.policyName });
      if (duplicatePolicy) {
        const ErrorResponse = new BuildResponse(
          this.fastifyReply,
          StatusCodes.CONFLICT,
          "Policy name already exists"
        );
        return ErrorResponse.send({
          error: `A policy with the name "${updateData.policyName}" already exists`
        });
      }
    }

    // Update the policy
    const updatedFields = {
      ...updateData,
      updatedAt: Date.now()
    };

    await dbClient.updateOne(
      { _id: new ObjectId(policyId) },
      { $set: updatedFields }
    );

    const updatedPolicy = await dbClient.findOne({ _id: new ObjectId(policyId) });

    // Immediately reload ACL policies to Redis
    try {
      await forceReloadACLPolicies();
    } catch (error) {
      console.error('[ACL] Failed to reload policies after update:', error);
      // Don't fail the request if Redis reload fails
    }

    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.OK,
      "Access control policy updated successfully"
    );

    return Responser.send({
      policy: updatedPolicy,
      message: "Policy updated successfully"
    });
  }

  /**
   * Toggle policy active status
   * @param {string} policyId - The policy ID
   * @returns {Promise<void>}
   */
  public async togglePolicyStatus(policyId: string): Promise<void> {
    console.log(`Toggling access control policy status with ID: ${policyId}`);

    if (!ObjectId.isValid(policyId)) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Invalid policy ID"
      );
      return ErrorResponse.send({
        error: "The provided policy ID is not valid"
      });
    }

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ACCESS_CONTROL_POLICIES);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    const existingPolicy = await dbClient.findOne({ _id: new ObjectId(policyId) });
    if (!existingPolicy) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.NOT_FOUND,
        "Policy not found"
      );
      return ErrorResponse.send({
        error: `Policy with ID "${policyId}" not found`
      });
    }

    const newStatus = !existingPolicy.isActive;

    await dbClient.updateOne(
      { _id: new ObjectId(policyId) },
      { $set: { isActive: newStatus, updatedAt: Date.now() } }
    );

    // Immediately reload ACL policies to Redis
    try {
      await forceReloadACLPolicies();
    } catch (error) {
      console.error('[ACL] Failed to reload policies after toggle:', error);
      // Don't fail the request if Redis reload fails
    }

    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.OK,
      "Policy status toggled successfully"
    );

    return Responser.send({
      policyId,
      isActive: newStatus,
      message: `Policy "${existingPolicy.policyName}" has been ${newStatus ? "activated" : "deactivated"}`
    });
  }

  /**
   * Delete an access control policy
   * @param {string} policyId - The policy ID
   * @returns {Promise<void>}
   */
  public async deletePolicy(policyId: string): Promise<void> {
    console.log(`Deleting access control policy with ID: ${policyId}`);

    if (!ObjectId.isValid(policyId)) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Invalid policy ID"
      );
      return ErrorResponse.send({
        error: "The provided policy ID is not valid"
      });
    }

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ACCESS_CONTROL_POLICIES);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    const existingPolicy = await dbClient.findOne({ _id: new ObjectId(policyId) });
    if (!existingPolicy) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.NOT_FOUND,
        "Policy not found"
      );
      return ErrorResponse.send({
        error: `Policy with ID "${policyId}" not found`
      });
    }

    await dbClient.deleteOne({ _id: new ObjectId(policyId) });

    // Immediately reload ACL policies to Redis
    try {
      await forceReloadACLPolicies();
    } catch (error) {
      console.error('[ACL] Failed to reload policies after delete:', error);
      // Don't fail the request if Redis reload fails
    }

    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.OK,
      "Access control policy deleted successfully"
    );

    return Responser.send({
      policyId,
      message: `Policy "${existingPolicy.policyName}" has been deleted successfully`
    });
  }
}
