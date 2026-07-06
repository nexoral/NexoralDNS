/**
 * @fileoverview Utility to initialize/seed the adult content domain group
 * @module Utils/InitializeAdultContentGroup
 * @description Creates or updates the predefined adult content domain group
 * used by the anti-porn mode feature
 *
 * @author NexoralDNS Team
 * @version 3.3.42-stable
 */

import logger from '../utilities/logger';
import { getCollectionClient } from '../Database/mongodb.db';
import { DB_DEFAULT_CONFIGS } from '../core/key';
import {
  ADULT_CONTENT_DOMAINS,
  ADULT_CONTENT_GROUP_METADATA,
} from '../Constants/AdultContentDomains.constant';
import type { ObjectId } from 'mongodb';

interface DomainGroupDocument {
  _id?: ObjectId;
  name: string;
  description: string;
  domains: Array<{ domain: string; isWildcard: boolean }>;
  isSystemGroup?: boolean;
  category?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Initialize the adult content domain group
 * - Checks if the group already exists
 * - Creates it if it doesn't exist
 * - Updates domains if the group exists but has different content
 *
 * @returns {Promise<ObjectId | null>} The ObjectId of the domain group, or null on failure
 */
export async function initializeAdultContentDomainGroup(): Promise<ObjectId | null> {
  try {
    const domainGroupsCollection = getCollectionClient(
      DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS
    );

    if (!domainGroupsCollection) {
      logger.error('[Anti-Porn Init] Failed to get domain_groups collection');
      return null;
    }

    // Check if the adult content group already exists
    const existingGroup = await domainGroupsCollection.findOne({
      name: ADULT_CONTENT_GROUP_METADATA.name,
      isSystemGroup: true,
    });

    const currentTimestamp = Date.now();

    if (existingGroup) {
      // Group exists, check if we need to update it
      const existingDomainCount = existingGroup.domains?.length || 0;
      const newDomainCount = ADULT_CONTENT_DOMAINS.length;

      if (existingDomainCount !== newDomainCount) {
        // Update the group with new domains
        logger.warn(
          `[Anti-Porn Init] Updating adult content group (${existingDomainCount} → ${newDomainCount} domains)`
        );

        const updateResult = await domainGroupsCollection.updateOne(
          { _id: existingGroup._id },
          {
            $set: {
              domains: ADULT_CONTENT_DOMAINS,
              description: ADULT_CONTENT_GROUP_METADATA.description,
              updatedAt: currentTimestamp,
            },
          }
        );

        if (updateResult.modifiedCount > 0) {
          logger.info(
            `[Anti-Porn Init] Adult content group updated successfully (ID: ${existingGroup._id})`
          );
        } else {
          logger.warn('[Anti-Porn Init] Adult content group already up to date');
        }
      } else {
        logger.info(
          `[Anti-Porn Init] Adult content group already exists (${existingDomainCount} domains)`
        );
      }

      return existingGroup._id;
    }

    // Group doesn't exist, create it
    logger.warn(
      `[Anti-Porn Init] Creating adult content domain group with ${ADULT_CONTENT_DOMAINS.length} domains...`
    );

    const newGroup: DomainGroupDocument = {
      name: ADULT_CONTENT_GROUP_METADATA.name,
      description: ADULT_CONTENT_GROUP_METADATA.description,
      domains: ADULT_CONTENT_DOMAINS,
      isSystemGroup: true,
      category: ADULT_CONTENT_GROUP_METADATA.category,
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    };

    const insertResult = await domainGroupsCollection.insertOne(newGroup);

    if (insertResult.acknowledged) {
      logger.info(
        `[Anti-Porn Init] Adult content domain group created successfully (ID: ${insertResult.insertedId})`
      );
      return insertResult.insertedId;
    }

    logger.error('[Anti-Porn Init] Failed to create adult content domain group');
    return null;
  } catch (error) {
    logger.error('[Anti-Porn Init] Error initializing adult content domain group:', error);
    return null;
  }
}

/**
 * Get the ObjectId of the adult content domain group
 * Useful for creating policies that reference this group
 *
 * @returns {Promise<ObjectId | null>} The ObjectId of the group, or null if not found
 */
export async function getAdultContentDomainGroupId(): Promise<ObjectId | null> {
  try {
    const domainGroupsCollection = getCollectionClient(
      DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS
    );

    if (!domainGroupsCollection) {
      logger.error('[Anti-Porn] Failed to get domain_groups collection');
      return null;
    }

    const group = await domainGroupsCollection.findOne({
      name: ADULT_CONTENT_GROUP_METADATA.name,
      isSystemGroup: true,
    });

    return group?._id || null;
  } catch (error) {
    logger.error('[Anti-Porn] Error getting adult content domain group ID:', error);
    return null;
  }
}

/**
 * Check if the adult content domain group exists
 *
 * @returns {Promise<boolean>} True if the group exists, false otherwise
 */
export async function adultContentDomainGroupExists(): Promise<boolean> {
  const groupId = await getAdultContentDomainGroupId();
  return groupId !== null;
}
