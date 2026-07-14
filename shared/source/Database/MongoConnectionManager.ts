/* eslint-disable @typescript-eslint/no-explicit-any */
import { MongoClient } from 'mongodb';
import os from 'os';
import logger from '../utilities/logger';

export class MongoConnectionManager {
  private client: MongoClient | null = null;
  private isConnecting = false;
  private connectionLogged = false;
  private readonly MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
  // Both server/ and Web/ hard-coded the same "nexoral_db" value in their own
  // config files; inlined here as an env-overridable constant so shared/ has
  // no dependency on either consumer's config module.
  private readonly DB_NAME = process.env.MONGO_DB_NAME || 'nexoral_db';

  private computePoolSize(): number {
    const TOTAL_CONNECTION_BUDGET = 200;
    const MIN_POOL_PER_WORKER = 20;
    const MAX_POOL_PER_WORKER = 50;
    // Hard ceiling that always wins over MIN_POOL_PER_WORKER, which would
    // otherwise override the budget above ~10 workers (48 x 20 = 960).
    const ABSOLUTE_MAX_AGGREGATE = 300;

    const totalUsableCpus = Math.max(1, Math.floor(os.cpus().length * 0.75));
    const perWorker = Math.floor(TOTAL_CONNECTION_BUDGET / totalUsableCpus);
    const bounded = Math.min(MAX_POOL_PER_WORKER, Math.max(MIN_POOL_PER_WORKER, perWorker));
    const aggregateCapped = Math.max(1, Math.floor(ABSOLUTE_MAX_AGGREGATE / totalUsableCpus));

    return Math.min(bounded, aggregateCapped);
  }

  async connect(): Promise<MongoClient> {
    if (this.client) {
      try {
        await this.client.db().admin().ping();
        return this.client;
      } catch {
        // dead connection, fall through to reconnect
      }
    }

    if (this.isConnecting) {
      let attempts = 0;
      while (this.isConnecting && attempts < 300) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (this.client) return this.client;
      throw new Error('MongoDB connection timeout');
    }

    this.isConnecting = true;

    try {
      logger.info('📡 Connecting to MongoDB...');
      this.client = new MongoClient(this.MONGO_URI, {
        maxPoolSize: this.computePoolSize(),
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 30000,
      });

      this.setupEventHandlers();
      await this.client.connect();

      logger.info('✅ Connected to MongoDB successfully');
      return this.client;
    } catch (error) {
      logger.error('❌ Failed to connect to MongoDB:', error as any);
      this.client = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('error', (err) => {
      logger.error('❌ MongoDB error:', err as any);
    });

    this.client.on('connectionPoolClosed', () => {
      logger.warn('🔴 MongoDB connection pool closed');
    });

    this.client.on('connectionCreated', () => {
      if (!this.connectionLogged) {
        this.connectionLogged = true;
        logger.info('🟢 MongoDB connection created');
      }
    });
  }

  getDatabase() {
    if (!this.client) {
      throw new Error('MongoDB client not connected');
    }
    return this.client.db(this.DB_NAME);
  }

  async close(): Promise<void> {
    if (this.client) {
      logger.info('🔌 Closing MongoDB connection...');
      await this.client.close();
      this.client = null;
      logger.info('✅ MongoDB connection closed');
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.db().admin().ping();
      return true;
    } catch {
      return false;
    }
  }
}
