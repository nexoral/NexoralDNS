import { logger } from 'nexoraldns-shared';
/**
 * @fileoverview Initialize AI Content Domain Group on Server Startup
 * @module utilities/InitializeAIContentGroup
 * @description Auto-creates or updates the AI content domain group with major
 * AI chatbot/assistant/generative-AI domains. This utility runs on server
 * startup to ensure the domain group exists for Anti-AI Mode
 *
 * @author NexoralDNS Team
 * @version 3.6.45-stable
 */

import container from '../container/appContainer';
import { MongoCollectionManager } from '../Database/MongoCollectionManager';
import { ObjectId } from 'mongodb';
import { DB_DEFAULT_CONFIGS } from '../core/key';
import {
  AI_CONTENT_DOMAINS,
  AI_CONTENT_GROUP_METADATA,
  getAIContentDomainsCount,
} from '../Constants/AIContentDomains.constant';

/**
 * Global cache for the AI content domain group ObjectId
 * Used to avoid repeated database queries
 */
let cachedAIContentGroupId: ObjectId | null = null;

/**
 * Initialize or update the AI content domain group
 * Creates the group if it doesn't exist, updates if domain count changed
 *
 * @returns {Promise<ObjectId | null>} The ObjectId of the AI content domain group
 */
export async function initializeAIContentDomainGroup(): Promise<ObjectId | null> {
  try {
    const domainGroupsCollection = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(
      DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS
    );

    if (!domainGroupsCollection) {
      logger.error('[Anti-AI] Failed to get domain groups collection');
      return null;
    }

    // Check if the AI content domain group already exists
    const existingGroup = await domainGroupsCollection.findOne({
      name: AI_CONTENT_GROUP_METADATA.name,
      isSystemGroup: true,
    });

    const currentDomainCount = getAIContentDomainsCount();

    if (existingGroup) {
      // Check if we need to update the domains (count changed)
      const existingDomainCount = existingGroup.domains?.length || 0;

      if (existingDomainCount !== currentDomainCount) {
        logger.warn(
          `[Anti-AI] Updating AI content domain group (${existingDomainCount} → ${currentDomainCount} domains)`
        );

        await domainGroupsCollection.updateOne(
          { _id: existingGroup._id },
          {
            $set: {
              domains: AI_CONTENT_DOMAINS,
              lastUpdated: AI_CONTENT_GROUP_METADATA.lastUpdated,
              version: AI_CONTENT_GROUP_METADATA.version,
            },
          }
        );

        logger.info('[Anti-AI] AI content domain group updated successfully');
      } else {
        logger.info('[Anti-AI] AI content domain group already up-to-date');
      }

      cachedAIContentGroupId = existingGroup._id;
      return existingGroup._id;
    }

    // Create new AI content domain group
    logger.warn(`[Anti-AI] Creating AI content domain group (${currentDomainCount} domains)...`);

    const newGroup = {
      name: AI_CONTENT_GROUP_METADATA.name,
      description: AI_CONTENT_GROUP_METADATA.description,
      domains: AI_CONTENT_DOMAINS,
      isSystemGroup: true,
      category: AI_CONTENT_GROUP_METADATA.category,
      lastUpdated: AI_CONTENT_GROUP_METADATA.lastUpdated,
      version: AI_CONTENT_GROUP_METADATA.version,
      createdAt: Date.now(),
    };

    const result = await domainGroupsCollection.insertOne(newGroup);

    if (result.insertedId) {
      cachedAIContentGroupId = result.insertedId;
      logger.info(`[Anti-AI] AI content domain group created successfully: ${result.insertedId}`);
      return result.insertedId;
    }

    logger.error('[Anti-AI] Failed to create AI content domain group');
    return null;
  } catch (error) {
    logger.error('[Anti-AI] Error initializing AI content domain group:', error);
    return null;
  }
}

/**
 * Get the ObjectId of the AI content domain group
 * Uses cached value if available, otherwise queries the database
 *
 * @returns {Promise<ObjectId | null>} The ObjectId of the AI content domain group
 */
export async function getAIContentDomainGroupId(): Promise<ObjectId | null> {
  // Return cached value if available
  if (cachedAIContentGroupId) {
    return cachedAIContentGroupId;
  }

  try {
    const domainGroupsCollection = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(
      DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS
    );

    if (!domainGroupsCollection) {
      return null;
    }

    const group = await domainGroupsCollection.findOne({
      name: AI_CONTENT_GROUP_METADATA.name,
      isSystemGroup: true,
    });

    if (group) {
      cachedAIContentGroupId = group._id;
      return group._id;
    }

    // If not found, try to initialize it
    return await initializeAIContentDomainGroup();
  } catch (error) {
    logger.error('[Anti-AI] Error getting AI content domain group ID:', error);
    return null;
  }
}

/**
 * Clear the cached AI content domain group ID
 * Useful for testing or when the group is deleted
 */
export function clearAIContentGroupCache(): void {
  cachedAIContentGroupId = null;
  logger.info('[Anti-AI] AI content domain group cache cleared');
}
