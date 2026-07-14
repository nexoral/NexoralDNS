/* eslint-disable @typescript-eslint/no-explicit-any */
import { RedisClientType } from 'redis';
import { RedisConnectionManager, RedisCacheStore, RedisPubSub } from 'nexoraldns-shared';
import { AclBlockingService } from './AclBlockingService';

export class RedisCacheService {
  constructor(
    private connectionManager: RedisConnectionManager,
    private cacheStore: RedisCacheStore,
    private pubSub: RedisPubSub,
    private aclService: AclBlockingService
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

  async close(): Promise<void> {
    await this.pubSub.close();
    await this.connectionManager.close();
  }

  async getBlockedDomainsForIP(ip: string): Promise<string[]> {
    return this.aclService.getBlockedDomainsForIP(ip);
  }

  async getGloballyBlockedDomains(): Promise<string[]> {
    return this.aclService.getGloballyBlockedDomains();
  }

  async getACLMetadata(): Promise<any> {
    return this.aclService.getACLMetadata();
  }

  async isDomainBlocked(ip: string, domain: string): Promise<boolean> {
    return this.aclService.isDomainBlocked(ip, domain);
  }
}
