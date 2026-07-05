/* eslint-disable @typescript-eslint/no-explicit-any */
import RedisCache from '../Redis/Redis.cache';
import { getCollectionClient } from '../Database/mongodb.db';
import { DB_DEFAULT_CONFIGS } from '../core/key';

export interface ISessionStore {
  getSession(token: string): Promise<any>;
}

export class CachedSessionStore implements ISessionStore {
  async getSession(token: string): Promise<any> {
    const redisTokenData = await RedisCache.get(`session:${token}`);
    if (redisTokenData) {
      return redisTokenData;
    }

    const sessionCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SESSION_MANAGE);
    if (!sessionCol) {
      return null;
    }

    const session = await sessionCol.findOne({ accessToken: token });

    if (session) {
      await RedisCache.set(`session:${token}`, session, 1800);
    }

    return session;
  }
}
