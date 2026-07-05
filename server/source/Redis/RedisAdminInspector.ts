/* eslint-disable @typescript-eslint/no-explicit-any */
import { Console } from 'outers';
import { RedisConnectionManager } from './RedisConnectionManager';

export class RedisAdminInspector {
  constructor(private connectionManager: RedisConnectionManager) {}

  async getAllRecords(pattern = '*', limit = 1000, skip = 0): Promise<any[]> {
    try {
      const client = await this.connectionManager.getClient();

      // Enumerate keys with SCAN — KEYS is O(N) and blocks the entire Redis server.
      const keys: string[] = [];
      let cursor = '0';
      do {
        const reply = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = reply.cursor;
        keys.push(...reply.keys);
      } while (cursor !== '0');

      const paginatedKeys = keys.slice(skip, skip + limit);

      // Resolve each key's type/ttl/value concurrently (auto-pipelined) instead of
      // sequential round-trips.
      const records = await Promise.all(paginatedKeys.map(async (key) => {
        const [type, ttl] = await Promise.all([client.type(key), client.ttl(key)]);

        let value: any;
        let size = 0;

        try {
          if (type === 'string') {
            value = await client.get(key);
            size = value?.length || 0;
          } else if (type === 'list') {
            value = await client.lRange(key, 0, -1);
            size = value?.length || 0;
          } else if (type === 'set') {
            value = await client.sMembers(key);
            size = value?.length || 0;
          } else if (type === 'hash') {
            value = await client.hGetAll(key);
            size = Object.keys(value).length;
          } else {
            value = null;
          }
        } catch (err) {
          value = null;
        }

        return {
          key,
          type,
          ttl: ttl === -1 ? 'no expiry' : ttl,
          value: type === 'string' ? value : `${type}(${size})`,
          expiresAt: ttl === -1 ? 'never' : new Date(Date.now() + ttl * 1000).toISOString()
        };
      }));

      return records;
    } catch (error) {
      Console.yellow(`⚠️  Failed to get records with pattern ${pattern}:`, error);
      return [];
    }
  }

  async deleteCacheEntry(key: string): Promise<boolean> {
    try {
      const client = await this.connectionManager.getClient();
      const result = await client.del(key);
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
