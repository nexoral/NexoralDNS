import { createClient, RedisClientType } from 'redis';
import IP_SCAN from '../service/AutoScanIPchange.service';

const REDIS_URL = process.env.REDIS_URI || 'redis://localhost:6379';
const BROKER_CHANNEL = 'broker:ip_change';

let redisClient: RedisClientType | null = null;

async function connectRedis(): Promise<RedisClientType> {
  const client = createClient({
    url: REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) return new Error('Max reconnection attempts reached');
        return Math.min(retries * 100, 3000);
      }
    }
  }) as RedisClientType;

  client.on('error', (err) => console.error('[DHCP Broker] Redis error:', err));
  client.on('reconnecting', () => console.log('[DHCP Broker] Redis reconnecting...'));
  client.on('ready', () => console.log('[DHCP Broker] Redis ready'));

  await client.connect();
  console.log('[DHCP Broker] Connected to Redis');
  redisClient = client;
  return client;
}

async function publishIPChange(): Promise<void> {
  if (!redisClient || !redisClient.isOpen) {
    console.warn('[DHCP Broker] Redis not connected, skipping publish');
    return;
  }
  const message = JSON.stringify({ event: 'INVOKE_IP_FETCH', timestamp: Date.now() });
  await redisClient.publish(BROKER_CHANNEL, message);
  console.log('[DHCP Broker] Published IP change event to', BROKER_CHANNEL);
}

export default async function createRedisBroker(): Promise<void> {
  try {
    await connectRedis();
    new IP_SCAN(publishIPChange).scan();
  } catch (error) {
    console.error('[DHCP Broker] Failed to connect to Redis, retrying in 5s:', error);
    setTimeout(createRedisBroker, 5000);
  }
}

if (process.argv[1] === __filename) {
  createRedisBroker();
}
