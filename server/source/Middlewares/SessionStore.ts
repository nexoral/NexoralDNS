/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCollectionClient } from '../Database/mongodb.db';
import { DB_DEFAULT_CONFIGS } from '../core/key';
import container from '../container/appContainer';
import { RedisCacheService } from '../Redis/Redis.cache';

export interface ISessionStore {
  getSession(token: string): Promise<any>;
}

export class CachedSessionStore implements ISessionStore {
  async getSession(token: string): Promise<any> {
    const redisCacheService = container.get<RedisCacheService>('RedisCacheService');
    const redisTokenData = await redisCacheService.get(`session:${token}`);
    if (redisTokenData) {
      return redisTokenData;
    }

    const sessionCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SESSION_MANAGE);
    if (!sessionCol) {
      return null;
    }

    const session = await sessionCol.findOne({ accessToken: token });

    if (session) {
      await redisCacheService.set(`session:${token}`, session, 1800);
    }

    return session;
  }
}
