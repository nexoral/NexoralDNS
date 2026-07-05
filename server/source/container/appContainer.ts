/* eslint-disable @typescript-eslint/no-explicit-any */
import { DIContainer } from './DIContainer';
import { MongoConnectionManager } from '../Database/MongoConnectionManager';
import { MongoCollectionManager } from '../Database/MongoCollectionManager';
import { RabbitMQConnectionManager } from '../RabbitMQ/RabbitMQConnectionManager';
import { RabbitMQQueueManager } from '../RabbitMQ/RabbitMQQueueManager';
import { RabbitMQPublisher } from '../RabbitMQ/RabbitMQPublisher';
import { RabbitMQConsumer } from '../RabbitMQ/RabbitMQConsumer';
import { RabbitMQService } from '../RabbitMQ/Rabbitmq.config';
import { RedisConnectionManager } from '../Redis/RedisConnectionManager';
import { RedisCacheStore } from '../Redis/RedisCacheStore';
import { RedisPubSub } from '../Redis/RedisPubSub';
import { RedisAdminInspector } from '../Redis/RedisAdminInspector';
import { RedisCacheService } from '../Redis/Redis.cache';
import { CookieHeaderTokenExtractor } from '../Middlewares/TokenExtractor';
import { CachedSessionStore } from '../Middlewares/SessionStore';
import UsersService from '../Services/Users/Users.service';
import RolesService from '../Services/Roles/Roles.service';
import LoginService from '../Services/Auth/Login.service';
import LogoutService from '../Services/Auth/Logout.service';
import RefreshTokenService from '../Services/Auth/RefreshToken.service';
import ChangePasswordService from '../Services/Auth/ChangePassword.service';
import VerifySessionService from '../Services/Auth/VerifySession.service';
import AddDNSService from '../Services/DNS/Add_DNS.service';
import DNSUpdateService from '../Services/DNS/DNS_Update.service';
import DNSDeleteService from '../Services/DNS/DNS_Delete.service';
import DNSListService from '../Services/DNS/DNS_List.service';
import AddDomainService from '../Services/Domain/Add_Domain.service';
import DomainListService from '../Services/Domain/Domain_List.service';
import RemoveDomainService from '../Services/Domain/Remove_Domain.service';
import DashboardService from '../Services/Dashboard/Dashboard.service';
import InfoService from '../Services/Public/Info.service';
import HealthService from '../Services/Public/Health.service';
import LogsService from '../Services/Logs/Logs.service';
import LogsExportService from '../Services/Logs/LogsExport.service';
import CacheService from '../Services/settings/Cache.service';
import DefaultTTLService from '../Services/settings/defaultTTL.service';
import ServiceToggleService from '../Services/settings/serviceToggle.service';
import AccessControlPolicyService from '../Services/AccessControl/AccessControlPolicy.service';
import DomainGroupService from '../Services/AccessControl/DomainGroup.service';
import IPGroupService from '../Services/AccessControl/IPGroup.service';
import RouterConnectionService from '../Services/DHCP/Router_connection.service';

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
    () => ({ mode: 'standalone', options: {} })
  ),
  true
);

container.register(
  'RedisAdminInspector',
  () => new RedisAdminInspector(
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
    container.get('RedisAdminInspector')
  ),
  true  // singleton
);

// ============================================
// AUTH SERVICES
// ============================================
container.register(
  'TokenExtractor',
  () => new CookieHeaderTokenExtractor(),
  true
);

container.register(
  'SessionStore',
  () => new CachedSessionStore(),
  true
);

// ============================================
// BUSINESS LOGIC SERVICES (26 total) - TRUE SINGLETONS
// ============================================
// Singleton instances - methods accept reply & data as parameters

// Auth Services
container.register('LoginService', () => new LoginService(), true);
container.register('LogoutService', () => new LogoutService(), true);
container.register('RefreshTokenService', () => new RefreshTokenService(), true);
container.register('ChangePasswordService', () => new ChangePasswordService(), true);
container.register('VerifySessionService', () => new VerifySessionService(), true);

// User Management
container.register('UsersService', () => new UsersService(), true);
container.register('RolesService', () => new RolesService(), true);

// DNS Management
container.register('AddDNSService', () => new AddDNSService(), true);
container.register('DNSUpdateService', () => new DNSUpdateService(), true);
container.register('DNSDeleteService', () => new DNSDeleteService(), true);
container.register('DNSListService', () => new DNSListService(), true);

// Domain Management
container.register('AddDomainService', () => new AddDomainService(), true);
container.register('DomainListService', () => new DomainListService(), true);
container.register('RemoveDomainService', () => new RemoveDomainService(), true);

// Access Control
container.register('AccessControlPolicyService', () => new AccessControlPolicyService(), true);
container.register('DomainGroupService', () => new DomainGroupService(), true);
container.register('IPGroupService', () => new IPGroupService(), true);

// Admin & Monitoring
container.register('DashboardService', () => new DashboardService(), true);
container.register('InfoService', () => new InfoService(), true);
container.register('HealthService', () => new HealthService(), true);

// Logs
container.register('LogsService', () => new LogsService(), true);
container.register('LogsExportService', () => new LogsExportService(), true);

// Settings
container.register('CacheService', () => new CacheService(), true);
container.register('DefaultTTLService', () => new DefaultTTLService(), true);
container.register('ServiceToggleService', () => new ServiceToggleService(), true);

// DHCP
container.register('RouterConnectionService', () => new RouterConnectionService(), true);

export default container;
