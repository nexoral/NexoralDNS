/* eslint-disable @typescript-eslint/no-explicit-any */
import { RedisClientType } from 'redis';
import { Console } from 'outers';

export class RedisAdminInspector {
  constructor(private client: RedisClientType) {}

  async getAllRecords(pattern = '*', limit = 1000, skip = 0): Promise<any[]> {
    try {
      const keys = await this.client.keys(pattern);
      const paginatedKeys = keys.slice(skip, skip + limit);

      const records: any[] = [];

      for (const key of paginatedKeys) {
        const type = await this.client.type(key);
        const ttl = await this.client.ttl(key);

        let value: any;
        let size = 0;

        try {
          if (type === 'string') {
            value = await this.client.get(key);
            size = value?.length || 0;
          } else if (type === 'list') {
            value = await this.client.lRange(key, 0, -1);
            size = value?.length || 0;
          } else if (type === 'set') {
            value = await this.client.sMembers(key);
            size = value?.length || 0;
          } else if (type === 'hash') {
            value = await this.client.hGetAll(key);
            size = Object.keys(value).length;
          } else {
            value = null;
          }
        } catch (err) {
          value = null;
        }

        records.push({
          key,
          type,
          ttl: ttl === -1 ? 'no expiry' : ttl,
          value: type === 'string' ? value : `${type}(${size})`,
          expiresAt: ttl === -1 ? 'never' : new Date(Date.now() + ttl * 1000).toISOString()
        });
      }

      return records;
    } catch (error) {
      Console.yellow(`⚠️  Failed to get records with pattern ${pattern}:`, error);
      return [];
    }
  }

  async deleteCacheEntry(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      if (result > 0) {
        Console.bright(`🗑️  Deleted cache entry: ${key}`);
        return true;
      }
      return false;
    } catch (error) {
      Console.yellow(`⚠️  Failed to delete cache entry ${key}:`, error);
      return false;
    }
  }
}
