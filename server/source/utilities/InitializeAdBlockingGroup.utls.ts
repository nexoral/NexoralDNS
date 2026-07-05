import logger from '../utilities/logger';
/**
 * @fileoverview Initialize Ad Blocking Domain Group on Server Startup
 * @module utilities/InitializeAdBlockingGroup
 * @description Auto-creates or updates the ad blocking domain group with comprehensive ad/tracking domains
 * This utility runs on server startup to ensure the domain group exists for Anti-Ads Mode
 *
 * @author NexoralDNS Team
 * @version 3.3.42-stable
 */

import container from '../container/appContainer';
import { MongoCollectionManager } from '../Database/MongoCollectionManager';
import { ObjectId } from 'mongodb';
import { DB_DEFAULT_CONFIGS } from '../core/key';
import {
  AD_BLOCKING_DOMAINS,
  AD_BLOCKING_GROUP_METADATA,
  getAdBlockingDomainsCount,
} from '../Constants/AdBlockingDomains.constant';

/**
 * Global cache for the ad blocking domain group ObjectId
 * Used to avoid repeated database queries
 */
let cachedAdBlockingGroupId: ObjectId | null = null;

/**
 * Initialize or update the ad blocking domain group
 * Creates the group if it doesn't exist, updates if domain count changed
 *
 * @returns {Promise<ObjectId | null>} The ObjectId of the ad blocking domain group
 */
export async function initializeAdBlockingDomainGroup(): Promise<ObjectId | null> {
  try {
    const domainGroupsCollection = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(
      DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS
    );

    if (!domainGroupsCollection) {
      logger.error('[Anti-Ads] Failed to get domain groups collection');
      return null;
    }

    // Check if the ad blocking domain group already exists
    const existingGroup = await domainGroupsCollection.findOne({
      name: AD_BLOCKING_GROUP_METADATA.name,
      isSystemGroup: true,
    });

    const currentDomainCount = getAdBlockingDomainsCount();

    if (existingGroup) {
      // Check if we need to update the domains (count changed)
      const existingDomainCount = existingGroup.domains?.length || 0;

      if (existingDomainCount !== currentDomainCount) {
        logger.warn(
          `[Anti-Ads] Updating ad blocking domain group (${existingDomainCount} → ${currentDomainCount} domains)`
        );

        await domainGroupsCollection.updateOne(
          { _id: existingGroup._id },
          {
            $set: {
              domains: AD_BLOCKING_DOMAINS,
              lastUpdated: AD_BLOCKING_GROUP_METADATA.lastUpdated,
              version: AD_BLOCKING_GROUP_METADATA.version,
            },
          }
        );

        logger.info('[Anti-Ads] Ad blocking domain group updated successfully');
      } else {
        logger.info('[Anti-Ads] Ad blocking domain group already up-to-date');
      }

      cachedAdBlockingGroupId = existingGroup._id;
      return existingGroup._id;
    }

    // Create new ad blocking domain group
    logger.warn(`[Anti-Ads] Creating ad blocking domain group (${currentDomainCount} domains)...`);

    const newGroup = {
      name: AD_BLOCKING_GROUP_METADATA.name,
      description: AD_BLOCKING_GROUP_METADATA.description,
      domains: AD_BLOCKING_DOMAINS,
      isSystemGroup: true,
      category: AD_BLOCKING_GROUP_METADATA.category,
      lastUpdated: AD_BLOCKING_GROUP_METADATA.lastUpdated,
      version: AD_BLOCKING_GROUP_METADATA.version,
      sources: AD_BLOCKING_GROUP_METADATA.sources,
      createdAt: Date.now(),
    };

    const result = await domainGroupsCollection.insertOne(newGroup);

    if (result.insertedId) {
      cachedAdBlockingGroupId = result.insertedId;
      logger.info(`[Anti-Ads] Ad blocking domain group created successfully: ${result.insertedId}`);
      return result.insertedId;
    }

    logger.error('[Anti-Ads] Failed to create ad blocking domain group');
    return null;
  } catch (error) {
    logger.error('[Anti-Ads] Error initializing ad blocking domain group:', error);
    return null;
  }
}

/**
 * Get the ObjectId of the ad blocking domain group
 * Uses cached value if available, otherwise queries the database
 *
 * @returns {Promise<ObjectId | null>} The ObjectId of the ad blocking domain group
 */
export async function getAdBlockingDomainGroupId(): Promise<ObjectId | null> {
  // Return cached value if available
  if (cachedAdBlockingGroupId) {
    return cachedAdBlockingGroupId;
  }

  try {
    const domainGroupsCollection = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(
      DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS
    );

    if (!domainGroupsCollection) {
      return null;
    }

    const group = await domainGroupsCollection.findOne({
      name: AD_BLOCKING_GROUP_METADATA.name,
      isSystemGroup: true,
    });

    if (group) {
      cachedAdBlockingGroupId = group._id;
      return group._id;
    }

    // If not found, try to initialize it
    return await initializeAdBlockingDomainGroup();
  } catch (error) {
    logger.error('[Anti-Ads] Error getting ad blocking domain group ID:', error);
    return null;
  }
}

/**
 * Clear the cached ad blocking domain group ID
 * Useful for testing or when the group is deleted
 */
export function clearAdBlockingGroupCache(): void {
  cachedAdBlockingGroupId = null;
  logger.info('[Anti-Ads] Ad blocking domain group cache cleared');
}
