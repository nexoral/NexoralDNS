/* eslint-disable @typescript-eslint/no-explicit-any */
import { MongoClient } from 'mongodb';
import logger from '../utilities/logger';
import os from 'os';
import { DB_DEFAULT_CONFIGS } from '../Config/key';

export class MongoConnectionManager {
  private client: MongoClient | null = null;
  private isConnecting = false;
  private readonly MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

  /**
   * Computes MongoDB connection pool size based on cluster width
   * Ensures aggregate connections across all workers stay within budget
   */
  private computePoolSize(): number {
    const TOTAL_CONNECTION_BUDGET = 200;
    const MIN_POOL_PER_WORKER = 20;
    const MAX_POOL_PER_WORKER = 50;

    const totalUsableCpus = Math.max(1, Math.floor(os.cpus().length * 0.75));
    const perWorker = Math.floor(TOTAL_CONNECTION_BUDGET / totalUsableCpus);

    return Math.min(MAX_POOL_PER_WORKER, Math.max(MIN_POOL_PER_WORKER, perWorker));
  }

  async connect(): Promise<MongoClient> {
    // If already connected, return
    if (this.client) {
      try {
        await this.client.db().admin().ping();
        return this.client;
      } catch {
        // Connection is dead, proceed to reconnect
      }
    }

    // If already connecting, wait for it
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
      logger.info('🟢 MongoDB connection created');
    });
  }

  getDatabase() {
    if (!this.client) {
      throw new Error('MongoDB client not connected');
    }
    return this.client.db(DB_DEFAULT_CONFIGS.DB_NAME);
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
