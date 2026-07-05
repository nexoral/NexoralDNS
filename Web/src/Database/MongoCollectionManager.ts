/* eslint-disable @typescript-eslint/no-explicit-any */
import { Collection, Document } from 'mongodb';
import { Console } from 'outers';
import { MongoConnectionManager } from './MongoConnectionManager';
import { DB_DEFAULT_CONFIGS } from '../Config/key';

export class MongoCollectionManager {
  private collectionCache = new Map<string, Collection<Document>>();
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

      for (const colName of collections) {
        const col = db.collection(colName);
        this.collectionCache.set(colName, col);
      }

      Console.green('✅ All collections initialized');
      this.initialized = true;
    } catch (error) {
      Console.red('❌ Failed to initialize collections:', error);
      throw error;
    }
  }

  /**
   * Get a collection by name
   */
  getCollection(collectionName: string): Collection<Document> | undefined {
    const collection = this.collectionCache.get(collectionName);
    if (!collection) {
      Console.yellow(`⚠️ Collection not found: ${collectionName}`);
    }
    return collection;
  }

  /**
   * Get all cached collections
   */
  getAllCollections(): Map<string, Collection<Document>> {
    return this.collectionCache;
  }
}
