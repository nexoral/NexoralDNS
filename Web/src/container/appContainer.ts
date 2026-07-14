/* eslint-disable @typescript-eslint/no-explicit-any */
import { DIContainer } from './DIContainer';
import {
  MongoConnectionManager,
  RabbitMQConnectionManager,
  RabbitMQQueueManager,
  RabbitMQPublisher,
  RabbitMQConsumer,
  RabbitMQService,
  RedisConnectionManager,
  RedisCacheStore,
  RedisPubSub,
} from 'nexoraldns-shared';
import { MongoCollectionManager } from '../Database/MongoCollectionManager';
import { AclBlockingService } from '../Redis/AclBlockingService';
import { RedisCacheService } from '../Redis/Redis.cache';
import { GlobalDNSforwarderService } from '../services/Forwarder/GlobalDNSforwarder.service';
import DNS from '../services/DNS/DNS.Service';
import DNS_TCP from '../services/DNS/DNS_TCP.Service';
import DNS_DoT from '../services/DNS/DNS_DoT.Service';
import StartRulesService from '../services/Start/Rules.service';
import BlockList from '../services/Rules/BlockList.service';
import ServiceStatusChecker from '../services/Start/ServiceStatusChecker.service';
import { DomainDBPoolService } from '../services/DB/DB_Pool.service';

const container = new DIContainer();

// ============================================
// MONGODB SERVICES
// ============================================
container.register(
  'MongoConnectionManager',
  () => new MongoConnectionManager(),
  true
);

container.register(
  'MongoCollectionManager',
  () => new MongoCollectionManager(
    container.get<MongoConnectionManager>('MongoConnectionManager')
  ),
  true
);

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
  () => new RabbitMQQueueManager(container.get<any>('RabbitMQConnectionManager')),
  true
);

container.register(
  'RabbitMQPublisher',
  () => new RabbitMQPublisher(
    container.get<any>('RabbitMQConnectionManager'),
    container.get('RabbitMQQueueManager')
  ),
  true
);

container.register(
  'RabbitMQConsumer',
  () => new RabbitMQConsumer(
    container.get<any>('RabbitMQConnectionManager'),
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
  () => new RedisCacheStore(
    container.get<RedisConnectionManager>('RedisConnectionManager')
  ),
  true
);

container.register(
  'RedisPubSub',
  () => new RedisPubSub(
    container.get<RedisConnectionManager>('RedisConnectionManager'),
    () => container.get<RedisConnectionManager>('RedisConnectionManager').getRedisConfig()
  ),
  true
);

container.register(
  'AclBlockingService',
  () => new AclBlockingService(
    container.get<RedisConnectionManager>('RedisConnectionManager')
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

// ============================================
// DNS FORWARDER SERVICE
// ============================================
container.register(
  'GlobalDNSforwarder',
  () => new GlobalDNSforwarderService(),
  true  // singleton
);

// ============================================
// DNS SERVICES
// ============================================
container.register(
  'DNS',
  () => new DNS(),
  true
);

container.register(
  'DNS_TCP',
  () => new DNS_TCP(),
  true
);

container.register(
  'DNS_DoT',
  () => new DNS_DoT(),
  true
);

// ============================================
// RULES & QUERY PROCESSING SERVICES
// ============================================
container.register(
  'StartRulesService',
  () => new StartRulesService(),
  true
);

container.register(
  'BlockList',
  () => new BlockList(),
  true
);

container.register(
  'ServiceStatusChecker',
  () => new ServiceStatusChecker(),
  true
);

// ============================================
// DATABASE SERVICES
// ============================================
container.register(
  'DomainDBPoolService',
  () => new DomainDBPoolService(),
  true
);

// Graceful shutdown - close all infra connections (RabbitMQ, Redis, Mongo) so
// buffered messages are flushed and in-flight work is drained. Each close is
// settled independently since a given connection may never have been opened.
const gracefulShutdown = async (): Promise<void> => {
  await Promise.allSettled([
    container.get<RabbitMQService>('RabbitMQService').close(),
    container.get<RedisConnectionManager>('RedisConnectionManager').close(),
    container.get<MongoConnectionManager>('MongoConnectionManager').close(),
  ]);
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default container;
