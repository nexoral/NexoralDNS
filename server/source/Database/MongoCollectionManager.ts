import logger from '../utilities/logger';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Collection, Document } from 'mongodb';
import { MongoConnectionManager } from 'nexoraldns-shared';
import { DB_DEFAULT_CONFIGS } from '../core/key';
import cluster from 'cluster';
import Bcrypt from '../helper/bcrypt.helper';
import { ClassBased } from 'outers';

export class MongoCollectionManager {
  private collectionCache = new Map<string, Collection<Document>>();
  private initialized = false;

  constructor(private connectionManager: MongoConnectionManager) {}

  /**
   * Initialize all collections and setup indexes/default data
   * Should be called once at application startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const client = await this.connectionManager.connect();
      const db = client.db(DB_DEFAULT_CONFIGS.DB_NAME);

      // Create and cache all collections
      const collections = [
        DB_DEFAULT_CONFIGS.Collections.PERMISSIONS,
        DB_DEFAULT_CONFIGS.Collections.ROLES,
        DB_DEFAULT_CONFIGS.Collections.USERS,
        DB_DEFAULT_CONFIGS.Collections.SERVICE,
        DB_DEFAULT_CONFIGS.Collections.DOMAINS,
        DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS,
        DB_DEFAULT_CONFIGS.Collections.ANALYTICS,
        DB_DEFAULT_CONFIGS.Collections.ACCESS_CONTROL_POLICIES,
        DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS,
        DB_DEFAULT_CONFIGS.Collections.IP_GROUPS,
        DB_DEFAULT_CONFIGS.Collections.SESSION_MANAGE,
      ];

      for (const colName of collections) {
        const col = db.collection(colName);
        this.collectionCache.set(colName, col);
      }

      logger.info('✅ All collections initialized');

      // Setup indexes only on primary process
      if (cluster.isPrimary) {
        await this.setupIndexes(db);
        await this.setupDefaultData();
      }

      this.initialized = true;
    } catch (error) {
      logger.error('❌ Failed to initialize collections:', error);
      throw error;
    }
  }

  private async setupIndexes(db: any): Promise<void> {
    try {
      const permissionsCol = db.collection(DB_DEFAULT_CONFIGS.Collections.PERMISSIONS);
      const rolesCol = db.collection(DB_DEFAULT_CONFIGS.Collections.ROLES);
      const usersCol = db.collection(DB_DEFAULT_CONFIGS.Collections.USERS);
      const serviceCol = db.collection(DB_DEFAULT_CONFIGS.Collections.SERVICE);
      const DnsAnalyticsCol = db.collection(DB_DEFAULT_CONFIGS.Collections.ANALYTICS);
      const domainsCol = db.collection(DB_DEFAULT_CONFIGS.Collections.DOMAINS);
      const dnsRecordsCol = db.collection(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);
      const accessControlPoliciesCol = db.collection(DB_DEFAULT_CONFIGS.Collections.ACCESS_CONTROL_POLICIES);
      const domainGroupsCol = db.collection(DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS);
      const ipGroupsCol = db.collection(DB_DEFAULT_CONFIGS.Collections.IP_GROUPS);
      const sessionManageCol = db.collection(DB_DEFAULT_CONFIGS.Collections.SESSION_MANAGE);

      // Core indexes
      await serviceCol.createIndex({ Service_Status: 1 }, { unique: true });
      await permissionsCol.createIndex({ code: 1 }, { unique: true });
      await rolesCol.createIndex({ code: 1 }, { unique: true });
      await usersCol.createIndex({ username: 1 }, { unique: true });

      // Analytics indexes
      await DnsAnalyticsCol.createIndex({ timestamp: 1 });
      await DnsAnalyticsCol.createIndex({ Status: 1 });
      await DnsAnalyticsCol.createIndex({ queryType: 1 });
      await DnsAnalyticsCol.createIndex({ From: 1 });
      await DnsAnalyticsCol.createIndex({ duration: 1 });
      await DnsAnalyticsCol.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });
      await DnsAnalyticsCol.createIndex({ updatedAt: 1 });
      await DnsAnalyticsCol.createIndex({ timestamp: 1, Status: 1 });
      await DnsAnalyticsCol.createIndex({ timestamp: 1, queryType: 1 });
      await DnsAnalyticsCol.createIndex({ timestamp: -1 });

      // Domain indexes
      await domainsCol.createIndex({ domainStatus: 1 });
      await dnsRecordsCol.createIndex({ domainId: 1 });

      // Access control indexes
      await accessControlPoliciesCol.createIndex({ policyName: 1 });
      await accessControlPoliciesCol.createIndex({ isActive: 1 });
      await accessControlPoliciesCol.createIndex({ policyType: 1 });
      await accessControlPoliciesCol.createIndex({ targetType: 1 });
      await accessControlPoliciesCol.createIndex({ createdAt: -1 });

      // Group indexes
      await domainGroupsCol.createIndex({ name: 1 }, { unique: true });
      await domainGroupsCol.createIndex({ createdAt: -1 });
      await ipGroupsCol.createIndex({ name: 1 }, { unique: true });
      await ipGroupsCol.createIndex({ createdAt: -1 });

      // Session management indexes
      await sessionManageCol.dropIndex('userId_1').catch(() => {});
      await sessionManageCol.createIndex({ userId: 1 }, { unique: true });
      await sessionManageCol.createIndex({ accessToken: 1 });
      await sessionManageCol.createIndex({ refreshToken: 1 });
      await sessionManageCol.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 48 * 60 * 60 });

      logger.info('✅ All indexes created');
    } catch (error) {
      logger.error('❌ Failed to setup indexes:', error);
      throw error;
    }
  }

  private async setupDefaultData(): Promise<void> {
    try {
      const permissionsCol = this.collectionCache.get(DB_DEFAULT_CONFIGS.Collections.PERMISSIONS)!;
      const rolesCol = this.collectionCache.get(DB_DEFAULT_CONFIGS.Collections.ROLES)!;
      const usersCol = this.collectionCache.get(DB_DEFAULT_CONFIGS.Collections.USERS)!;
      const serviceCol = this.collectionCache.get(DB_DEFAULT_CONFIGS.Collections.SERVICE)!;

      // Insert permissions
      const existingPerms = await permissionsCol.countDocuments();
      let InsertedPermissions = [];
      if (existingPerms === 0) {
        for (const perm of DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_PERMISSIONS_TYPE) {
          const result = await permissionsCol.insertOne(perm);
          const NewPerm = await permissionsCol.findOne({ _id: result.insertedId });
          if (NewPerm) InsertedPermissions.push(NewPerm);
        }
        logger.info('✅ Permissions inserted');
      } else {
        const allPerms = await permissionsCol.find().toArray();
        InsertedPermissions = allPerms;
        logger.info('ℹ️ Permissions already exist');
      }

      // Insert roles
      const allRoles = await rolesCol.countDocuments();
      let InsertedRoles = [];
      if (allRoles === 0) {
        for (const role of DB_DEFAULT_CONFIGS.DefaultValues.DefaultRoles) {
          const result = await rolesCol.insertOne({
            code: role.code,
            name: role.role,
            permissions: InsertedPermissions.filter(p => role.permissions.includes(p.code)).map(p => p._id),
          });
          const NewRole = await rolesCol.findOne({ _id: result.insertedId });
          if (NewRole) InsertedRoles.push(NewRole);
        }
        logger.info('✅ Default roles created');
      } else {
        logger.info('ℹ️ Default roles already exist');
      }

      // Insert admin user
      const adminUser = await usersCol.findOne({ username: DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_USERNAME });
      if (!adminUser) {
        await usersCol.insertOne({
          username: DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_USERNAME,
          password: await new Bcrypt().Encrypt(DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_PASSWORD),
          roleId: InsertedRoles.find(r => r.name === DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_ADMIN_ROLE)?._id,
          passwordUpdatedAt: null,
          createdAt: Date.now(),
        });
        logger.info('✅ Admin user created');
      } else {
        logger.info('ℹ️ Admin user already exists');
      }

      // Insert service config
      const serviceConfig = await serviceCol.findOne({ SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME });
      if (!serviceConfig) {
        await serviceCol.insertOne({
          SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME,
          CLOUD_URL: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.CLOUD_URL,
          apiKey: await new ClassBased.CryptoGraphy(process.arch).Encrypt(DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.API_KEY),
          createdAt: Date.now(),
          DefaultTTL: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.DefaultTTL,
          Service_Status: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.Service_Status,
          Connected_At: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.Connected_At,
          Disconnected_At: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.Disconnected_At,
          Last_Synced_At: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.Last_Synced_At,
          Next_Expected_Sync_At: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.Next_Expected_Sync_At,
          Total_Connected_Devices_To_Router: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.Total_Connected_Devices_To_Router,
          List_of_Connected_Devices_Info: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.List_of_Connected_Devices_Info,
        });
        logger.info('✅ Default service config created');
      }

      logger.info('🎉 RBAC setup completed');
    } catch (error) {
      logger.error('❌ Failed to setup default data:', error);
      throw error;
    }
  }

  /**
   * Get a collection by name
   */
  getCollection(collectionName: string): Collection<Document> | undefined {
    try {
      // Resolve fresh from the current client each call so a reconnect (new
      // MongoClient) never leaves callers holding a handle bound to a dead client.
      return this.connectionManager.getDatabase().collection(collectionName);
    } catch (error) {
      logger.warn(`⚠️ Collection not available: ${collectionName}`, error);
      return undefined;
    }
  }

  /**
   * Get all cached collections
   */
  getAllCollections(): Map<string, Collection<Document>> {
    return this.collectionCache;
  }
}
