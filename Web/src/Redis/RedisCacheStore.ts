/* eslint-disable @typescript-eslint/no-explicit-any */
import { RedisClientType } from 'redis';
import { Console } from 'outers';

export class RedisCacheStore {
  constructor(private client: RedisClientType) {}

  async set(key: string, value: any, ttl = 60): Promise<void> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      Console.yellow(`⚠️  Failed to set key ${key}:`, error);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const cached = await this.client.get(key);

      if (!cached) return null;

      try {
        return JSON.parse(cached);
      } catch {
        return cached as T;
      }
    } catch (error) {
      Console.yellow(`⚠️  Failed to get key ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      Console.yellow(`⚠️  Failed to delete key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      Console.yellow(`⚠️  Failed to check existence of key ${key}:`, error);
      return false;
    }
  }

  async invalidate(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(keys);
        Console.bright(`🗑️  Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
        return keys.length;
      }

      return 0;
    } catch (error) {
      Console.yellow(`⚠️  Failed to invalidate pattern ${pattern}:`, error);
      return 0;
    }
  }

  async getTTL(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      Console.yellow(`⚠️  Failed to get TTL for key ${key}:`, error);
      return -1;
    }
  }

  async expire(key: string, seconds: number): Promise<number> {
    try {
      const result = await this.client.expire(key, seconds);
      return result;
    } catch (error) {
      Console.yellow(`⚠️  Failed to set expiration for key ${key}:`, error);
      return 0;
    }
  }

  async flushAll(): Promise<void> {
    try {
      await this.client.flushAll();
      Console.green('✅ All cache cleared!');
    } catch (error) {
      Console.red('❌ Failed to clear cache:', error);
    }
  }

  async getStats(): Promise<any> {
    try {
      const info = await this.client.info();

      const stats: any = {};
      info.split('\r\n').forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });

      return {
        connected_clients: stats.connected_clients,
        used_memory: stats.used_memory_human,
        used_memory_peak: stats.used_memory_peak_human,
        total_commands_processed: stats.total_commands_processed,
        keyspace_hits: stats.keyspace_hits,
        keyspace_misses: stats.keyspace_misses,
        hit_rate: this.calculateHitRate(stats.keyspace_hits, stats.keyspace_misses)
      };
    } catch (error) {
      Console.red('❌ Failed to get cache stats:', error);
      return null;
    }
  }

  private calculateHitRate(hits: string, misses: string): string {
    const h = parseInt(hits) || 0;
    const m = parseInt(misses) || 0;
    const total = h + m;
    if (total === 0) return '0%';
    return `${((h / total) * 100).toFixed(2)}%`;
  }
}
