import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";
import AccessControlPolicyService, { AccessControlPolicyData } from "../../Services/AccessControl/AccessControlPolicy.service";
import RequestControllerHelper from "../../helper/Request_Controller.helper";

// Singleton instance for request deduplication
const requestHelper = new RequestControllerHelper();

/**
 * AccessControlController handles access control policy-related requests.
 * It provides methods for creating, reading, updating, and deleting access control policies.
 * @class
 * @method createPolicy - Handles creating a new access control policy
 * @method getPolicies - Handles fetching all access control policies with optional filtering
 * @method getPolicyById - Handles fetching a single access control policy by ID
 * @method updatePolicy - Handles updating an access control policy
 * @method togglePolicyStatus - Handles toggling policy active status
 * @method deletePolicy - Handles deleting an access control policy
 * @param {authGuardFastifyRequest} request - The Fastify request object
 * @param {FastifyReply} reply - The Fastify reply object for sending responses
 * @returns {Promise<void>} - A promise that resolves when the operation is complete
 */
export default class AccessControlController {
  constructor() { }

  /**
   * Create a new access control policy
   */
  public static async createPolicy(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const policyData = request.body as AccessControlPolicyData;
    const requestKey = `create-policy:${request.user._id}:${policyData.policyName}`;

    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Failed to create policy");
    const policyService = new AccessControlPolicyService(reply);

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await policyService.createPolicy(policyData);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => {
        console.log(`[DEDUP] Duplicate create policy request detected for ${key}, waiting for existing request...`);
      },
      (key) => {
        console.log(`[CLEANUP] Removed in-flight create policy request for ${key}`);
      }
    );
  }

  /**
   * Get all access control policies with optional filtering
   */
  public static getPolicies(request: authGuardFastifyRequest, reply: FastifyReply) {
    const Responser = new BuildResponse(reply, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to fetch policies");
    const policyService = new AccessControlPolicyService(reply);

    try {
      const requestQuery = request.query as { filter?: string; skip?: string; limit?: string };
      const filter = requestQuery.filter || "all";
      const skip = parseFloat(requestQuery.skip || "0") || 0;
      const limit = parseFloat(requestQuery.limit || "50") || 50;

      return policyService.getPolicies(filter, skip, limit);
    } catch (error) {
      return Responser.send(error);
    }
  }

  /**
   * Get a single access control policy by ID
   */
  public static getPolicyById(request: authGuardFastifyRequest, reply: FastifyReply) {
    const Responser = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Failed to fetch policy");
    const policyService = new AccessControlPolicyService(reply);

    try {
      const { policyId } = request.params as { policyId: string };
      return policyService.getPolicyById(policyId);
    } catch (error) {
      return Responser.send(error);
    }
  }

  /**
   * Update an access control policy
   */
  public static async updatePolicy(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { policyId } = request.params as { policyId: string };
    const updateData = request.body as Partial<AccessControlPolicyData>;
    const requestKey = `update-policy:${request.user._id}:${policyId}`;

    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Failed to update policy");
    const policyService = new AccessControlPolicyService(reply);

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await policyService.updatePolicy(policyId, updateData);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => {
        console.log(`[DEDUP] Duplicate update policy request detected for ${key}, waiting for existing request...`);
      },
      (key) => {
        console.log(`[CLEANUP] Removed in-flight update policy request for ${key}`);
      }
    );
  }

  /**
   * Toggle policy active status
   */
  public static async togglePolicyStatus(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { policyId } = request.params as { policyId: string };
    const requestKey = `toggle-policy:${request.user._id}:${policyId}`;

    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Failed to toggle policy status");
    const policyService = new AccessControlPolicyService(reply);

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await policyService.togglePolicyStatus(policyId);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => {
        console.log(`[DEDUP] Duplicate toggle policy request detected for ${key}, waiting for existing request...`);
      },
      (key) => {
        console.log(`[CLEANUP] Removed in-flight toggle policy request for ${key}`);
      }
    );
  }

  /**
   * Delete an access control policy
   */
  public static async deletePolicy(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const { policyId } = request.params as { policyId: string };
    const requestKey = `delete-policy:${request.user._id}:${policyId}`;

    const Responser = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Failed to delete policy");
    const policyService = new AccessControlPolicyService(reply);

    await requestHelper.executeWithDeduplication(
      requestKey,
      async () => {
        try {
          await policyService.deletePolicy(policyId);
        } catch (error) {
          return Responser.send(error);
        }
      },
      (key) => {
        console.log(`[DEDUP] Duplicate delete policy request detected for ${key}, waiting for existing request...`);
      },
      (key) => {
        console.log(`[CLEANUP] Removed in-flight delete policy request for ${key}`);
      }
    );
  }
}
