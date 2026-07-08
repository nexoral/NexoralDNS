import { describe, it, expect } from 'vitest';
import container from '@server/source/container/appContainer';

const INFRA_KEYS = [
  'MongoConnectionManager', 'MongoCollectionManager',
  'RabbitMQConnectionManager', 'RabbitMQQueueManager', 'RabbitMQPublisher', 'RabbitMQConsumer', 'RabbitMQService',
  'RedisConnectionManager', 'RedisCacheStore', 'RedisPubSub', 'RedisAdminInspector', 'RedisCacheService',
  'TokenExtractor', 'SessionStore',
];

const SERVICE_KEYS = [
  'LoginService', 'LogoutService', 'RefreshTokenService', 'ChangePasswordService', 'VerifySessionService',
  'UsersService', 'RolesService',
  'AddDNSService', 'DNSUpdateService', 'DNSDeleteService', 'DNSListService',
  'AddDomainService', 'DomainListService', 'RemoveDomainService',
  'AccessControlPolicyService', 'DomainGroupService', 'IPGroupService',
  'DashboardService', 'InfoService', 'HealthService',
  'LogsService', 'LogsExportService',
  'CacheService', 'DefaultTTLService', 'ServiceToggleService',
  'RouterConnectionService',
];

describe('appContainer', () => {
  it('registers every infrastructure service', () => {
    for (const key of INFRA_KEYS) expect(container.has(key), key).toBe(true);
  });

  it('registers all 26 business-logic services', () => {
    for (const key of SERVICE_KEYS) expect(container.has(key), key).toBe(true);
    expect(SERVICE_KEYS).toHaveLength(26);
  });

  it('resolves the infrastructure singletons to a single shared instance', () => {
    for (const key of ['RedisCacheService', 'RabbitMQService', 'MongoCollectionManager', 'RedisConnectionManager']) {
      expect(container.get(key), key).toBe(container.get(key));
    }
  });

  it('resolves a business service as a cached singleton', () => {
    expect(container.get('LoginService')).toBe(container.get('LoginService'));
  });

  it('rejects per-call arguments on a singleton', () => {
    expect(() => container.get('RedisCacheService', 'oops')).toThrowError(/singleton/);
  });

  it('throws for an unknown key', () => {
    expect(() => container.get('NopeService')).toThrowError(/not registered/);
  });
});
