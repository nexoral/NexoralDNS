/* eslint-disable @typescript-eslint/no-explicit-any */
import { RedisClientType } from 'redis';
import { RedisConnectionManager } from './RedisConnectionManager';
import { RedisCacheStore } from './RedisCacheStore';
import { RedisPubSub } from './RedisPubSub';
import { RedisAdminInspector } from './RedisAdminInspector';

export class RedisCacheService {
  constructor(
    private connectionManager: RedisConnectionManager,
    private cacheStore: RedisCacheStore,
    private pubSub: RedisPubSub,
    private adminInspector: RedisAdminInspector
  ) {}

  public async connect(): Promise<RedisClientType> {
    return this.connectionManager.connect();
  }

  public async getClient(): Promise<RedisClientType> {
    return this.connectionManager.getClient();
  }

  async set(key: string, value: any, ttl = 60): Promise<void> {
    return this.cacheStore.set(key, value, ttl);
  }

  async get<T = any>(key: string): Promise<T | null> {
    return this.cacheStore.get<T>(key);
  }

  async delete(key: string): Promise<boolean> {
    return this.cacheStore.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.cacheStore.exists(key);
  }

  async invalidate(pattern: string): Promise<number> {
    return this.cacheStore.invalidate(pattern);
  }

  async getTTL(key: string): Promise<number> {
    return this.cacheStore.getTTL(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.cacheStore.expire(key, seconds);
  }

  async flushAll(): Promise<void> {
    return this.cacheStore.flushAll();
  }

  async getStats(): Promise<any> {
    return this.cacheStore.getStats();
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    return this.pubSub.subscribe(channel, callback);
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.pubSub.publish(channel, message);
  }

  async getAllRecords(pattern = '*', limit = 1000, skip = 0): Promise<any[]> {
    return this.adminInspector.getAllRecords(pattern, limit, skip);
  }

  async deleteCacheEntry(key: string): Promise<boolean> {
    return this.adminInspector.deleteCacheEntry(key);
  }

  async close(): Promise<void> {
    await this.pubSub.close();
    await this.connectionManager.close();
  }
}
