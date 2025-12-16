import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { getCollectionClient } from "../../Database/mongodb.db";

export default class AccessControlAnalyticsService {
  private readonly fastifyReply: FastifyReply;

  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  /**
   * Get access control analytics statistics
   * @returns {Promise<void>}
   */
  public async getAnalytics(): Promise<void> {
    console.log("Fetching access control analytics...");

    const policiesCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ACCESS_CONTROL_POLICIES);
    const domainGroupsCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS);
    const ipGroupsCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.IP_GROUPS);

    if (!policiesCol || !domainGroupsCol || !ipGroupsCol) {
      throw new Error("Database connection error.");
    }

    try {
      // Count active policies
      const activePoliciesCount = await policiesCol.countDocuments({ isActive: true });

      // Count total policies
      const totalPoliciesCount = await policiesCol.countDocuments();

      // Get all active policies to calculate blocked users and domains
      const activePolicies = await policiesCol.find({ isActive: true }).toArray();

      // Calculate blocked users (unique IPs/IP groups)
      const blockedUsersSet = new Set<string>();
      activePolicies.forEach(policy => {
        if (policy.targetType === 'single_ip' && policy.targetIP) {
          blockedUsersSet.add(policy.targetIP);
        } else if (policy.targetType === 'ip_group' && policy.targetIPGroup) {
          blockedUsersSet.add(policy.targetIPGroup);
        } else if (policy.targetType === 'all') {
          blockedUsersSet.add('all_users');
        }
      });
      const blockedUsersCount = blockedUsersSet.size;

      // Calculate blocked domains (unique domains from specific_domains and domain groups)
      const blockedDomainsSet = new Set<string>();
      for (const policy of activePolicies) {
        if (policy.blockType === 'specific_domains' && policy.domains) {
          policy.domains.forEach((domain: string) => blockedDomainsSet.add(domain));
        } else if (policy.blockType === 'domain_group' && policy.domainGroup) {
          // Find the domain group and add its domains
          const domainGroup = await domainGroupsCol.findOne({ name: policy.domainGroup });
          if (domainGroup && domainGroup.domains) {
            domainGroup.domains.forEach((domain: string) => blockedDomainsSet.add(domain));
          }
        } else if (policy.blockType === 'full_internet') {
          blockedDomainsSet.add('*');
        }
      }
      const blockedDomainsCount = blockedDomainsSet.size;

      // Blocks Today - This would require actual blocking logs
      // For now, returning 0 as placeholder
      // TODO: Implement actual blocking logs tracking
      const blocksTodayCount = 0;

      // Additional statistics
      const domainGroupsCount = await domainGroupsCol.countDocuments();
      const ipGroupsCount = await ipGroupsCol.countDocuments();

      const Responser = new BuildResponse(
        this.fastifyReply,
        StatusCodes.OK,
        "Analytics fetched successfully"
      );

      return Responser.send({
        activePolicies: activePoliciesCount,
        totalPolicies: totalPoliciesCount,
        blockedUsers: blockedUsersCount,
        blockedDomains: blockedDomainsCount,
        blocksToday: blocksTodayCount,
        domainGroups: domainGroupsCount,
        ipGroups: ipGroupsCount,
        message: "Access control analytics retrieved successfully"
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to fetch analytics"
      );
      return ErrorResponse.send({
        error: "An error occurred while fetching analytics"
      });
    }
  }

  /**
   * Get detailed policy statistics
   * @returns {Promise<void>}
   */
  public async getPolicyStatistics(): Promise<void> {
    console.log("Fetching detailed policy statistics...");

    const policiesCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ACCESS_CONTROL_POLICIES);
    if (!policiesCol) {
      throw new Error("Database connection error.");
    }

    try {
      // Count policies by type
      const byType = {
        user_domain: await policiesCol.countDocuments({ policyType: 'user_domain' }),
        user_internet: await policiesCol.countDocuments({ policyType: 'user_internet' }),
        domain_all: await policiesCol.countDocuments({ policyType: 'domain_all' }),
        domain_user: await policiesCol.countDocuments({ policyType: 'domain_user' }),
        group_based: await policiesCol.countDocuments({ policyType: 'group_based' })
      };

      // Count policies by status
      const byStatus = {
        active: await policiesCol.countDocuments({ isActive: true }),
        inactive: await policiesCol.countDocuments({ isActive: false })
      };

      // Count policies by target type
      const byTarget = {
        single_ip: await policiesCol.countDocuments({ targetType: 'single_ip' }),
        ip_group: await policiesCol.countDocuments({ targetType: 'ip_group' }),
        all: await policiesCol.countDocuments({ targetType: 'all' })
      };

      // Count policies by block type
      const byBlockType = {
        specific_domains: await policiesCol.countDocuments({ blockType: 'specific_domains' }),
        domain_group: await policiesCol.countDocuments({ blockType: 'domain_group' }),
        full_internet: await policiesCol.countDocuments({ blockType: 'full_internet' })
      };

      const Responser = new BuildResponse(
        this.fastifyReply,
        StatusCodes.OK,
        "Policy statistics fetched successfully"
      );

      return Responser.send({
        byType,
        byStatus,
        byTarget,
        byBlockType,
        total: byStatus.active + byStatus.inactive,
        message: "Policy statistics retrieved successfully"
      });
    } catch (error) {
      console.error("Error fetching policy statistics:", error);
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to fetch policy statistics"
      );
      return ErrorResponse.send({
        error: "An error occurred while fetching policy statistics"
      });
    }
  }
}
