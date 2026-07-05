/* eslint-disable @typescript-eslint/no-explicit-any */
import { DIContainer } from './DIContainer';
import { RabbitMQConnectionManager } from '../RabbitMQ/RabbitMQConnectionManager';
import { RabbitMQQueueManager } from '../RabbitMQ/RabbitMQQueueManager';
import { RabbitMQPublisher } from '../RabbitMQ/RabbitMQPublisher';
import { RabbitMQConsumer } from '../RabbitMQ/RabbitMQConsumer';
import { RabbitMQService } from '../RabbitMQ/Rabbitmq.config';
import { RedisConnectionManager } from '../Redis/RedisConnectionManager';
import { RedisCacheStore } from '../Redis/RedisCacheStore';
import { RedisPubSub } from '../Redis/RedisPubSub';
import { AclBlockingService } from '../Redis/AclBlockingService';
import { RedisCacheService } from '../Redis/Redis.cache';

const container = new DIContainer();

// ============================================
// RABBITMQ SERVICES
// ============================================
container.register(
  'RabbitMQConnectionManager',
  () => new RabbitMQConnectionManager(),
  true
);

container.register(
  'RabbitMQQueueManager',
  () => new RabbitMQQueueManager(container.get<any>('RabbitMQConnectionManager').getChannel()),
  true
);

container.register(
  'RabbitMQPublisher',
  () => new RabbitMQPublisher(
    container.get<any>('RabbitMQConnectionManager').getChannel(),
    container.get('RabbitMQQueueManager')
  ),
  true
);

container.register(
  'RabbitMQConsumer',
  () => new RabbitMQConsumer(
    container.get<any>('RabbitMQConnectionManager').getChannel(),
    container.get('RabbitMQQueueManager')
  ),
  true
);

// ← Main service - DI container manages singleton
container.register(
  'RabbitMQService',
  () => new RabbitMQService(
    container.get('RabbitMQConnectionManager'),
    container.get('RabbitMQQueueManager'),
    container.get('RabbitMQPublisher'),
    container.get('RabbitMQConsumer')
  ),
  true  // singleton
);

// ============================================
// REDIS SERVICES
// ============================================
container.register(
  'RedisConnectionManager',
  () => new RedisConnectionManager(),
  true
);

container.register(
  'RedisCacheStore',
  async () => new RedisCacheStore(
    await container.get<RedisConnectionManager>('RedisConnectionManager').connect()
  ),
  true
);

container.register(
  'RedisPubSub',
  async () => new RedisPubSub(
    await container.get<RedisConnectionManager>('RedisConnectionManager').connect(),
    () => ({ mode: 'standalone', options: {} })
  ),
  true
);

container.register(
  'AclBlockingService',
  async () => new AclBlockingService(
    await container.get<RedisConnectionManager>('RedisConnectionManager').connect()
  ),
  true
);

// ← Main service - DI container manages singleton
container.register(
  'RedisCacheService',
  () => new RedisCacheService(
    container.get('RedisConnectionManager'),
    container.get('RedisCacheStore'),
    container.get('RedisPubSub'),
    container.get('AclBlockingService')
  ),
  true  // singleton
);

export default container;
