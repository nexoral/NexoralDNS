/* eslint-disable @typescript-eslint/no-explicit-any */
import { Collection, Document } from 'mongodb';
import { logger, MongoConnectionManager } from 'nexoraldns-shared';
import { DB_DEFAULT_CONFIGS } from '../Config/key';

export class MongoCollectionManager {
  private initialized = false;

  constructor(private connectionManager: MongoConnectionManager) {}

  /**
   * Initialize all collections
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
        DB_DEFAULT_CONFIGS.Collections.LOGS,
        DB_DEFAULT_CONFIGS.Collections.RULES,
      ];

      // Touch each collection once so any lazy setup runs; handles are NOT cached
      // for reuse — getCollection() resolves them fresh so a client reconnect
      // (new MongoClient) never leaves callers holding a dead handle.
      for (const colName of collections) {
        db.collection(colName);
      }

      logger.info('✅ All collections initialized');
      this.initialized = true;
    } catch (error) {
      logger.error('❌ Failed to initialize collections:', error as any);
      throw error;
    }
  }

  /**
   * Get a collection by name
   */
  getCollection(collectionName: string): Collection<Document> | undefined {
    try {
      // Resolve fresh from the current client each call (resilient to reconnects).
      return this.connectionManager.getDatabase().collection(collectionName);
    } catch (error) {
      logger.warn(`⚠️ Collection not available: ${collectionName}`, error as any);
      return undefined;
    }
  }
};