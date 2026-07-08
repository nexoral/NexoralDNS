import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Config/key: DB_DEFAULT_CONFIGS', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('falls back to localhost Mongo URI when MONGO_URI is unset', async () => {
    delete process.env.MONGO_URI;
    const { DB_DEFAULT_CONFIGS } = await import('@web/Config/key');
    expect(DB_DEFAULT_CONFIGS.HOST).toBe('mongodb://localhost:27017');
  });

  it('honors MONGO_URI when set', async () => {
    process.env.MONGO_URI = 'mongodb://custom-host:27099';
    const { DB_DEFAULT_CONFIGS } = await import('@web/Config/key');
    expect(DB_DEFAULT_CONFIGS.HOST).toBe('mongodb://custom-host:27099');
  });

  it('exposes the fixed database name and collection names', async () => {
    const { DB_DEFAULT_CONFIGS } = await import('@web/Config/key');
    expect(DB_DEFAULT_CONFIGS.DB_NAME).toBe('nexoral_db');
    expect(DB_DEFAULT_CONFIGS.Collections).toEqual({
      USERS: 'users',
      ROLES: 'roles',
      PERMISSIONS: 'permissions',
      SERVICE: 'service',
      DOMAINS: 'domains',
      DNS_RECORDS: 'dns_records',
      LOGS: 'logs',
      RULES: 'rules',
      ANALYTICS: 'analytics',
    });
  });

  it('defines the Super Admin default role with full access permission', async () => {
    const { DB_DEFAULT_CONFIGS } = await import('@web/Config/key');
    const superAdmin = DB_DEFAULT_CONFIGS.DefaultValues.DefaultRoles.find((r) => r.role === 'Super Admin');
    expect(superAdmin).toBeDefined();
    expect(superAdmin?.code).toBe(1);
    expect(superAdmin?.permissions).toContain(4);
  });

  it('defines exactly 5 default roles and 17 permission types', async () => {
    const { DB_DEFAULT_CONFIGS } = await import('@web/Config/key');
    expect(DB_DEFAULT_CONFIGS.DefaultValues.DefaultRoles).toHaveLength(5);
    expect(DB_DEFAULT_CONFIGS.DefaultValues.DEFAULT_PERMISSIONS_TYPE).toHaveLength(17);
  });

  it('reads SERVICE_API_KEY and CLOUD_URL from env, undefined when unset', async () => {
    delete process.env.SERVICE_API_KEY;
    delete process.env.CLOUD_URL;
    const { DB_DEFAULT_CONFIGS } = await import('@web/Config/key');
    expect(DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.API_KEY).toBeUndefined();
    expect(DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.CLOUD_URL).toBeUndefined();
  });

  it('honors SERVICE_API_KEY and CLOUD_URL when set', async () => {
    process.env.SERVICE_API_KEY = 'abc123';
    process.env.CLOUD_URL = 'https://cloud.example';
    const { DB_DEFAULT_CONFIGS } = await import('@web/Config/key');
    expect(DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.API_KEY).toBe('abc123');
    expect(DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.CLOUD_URL).toBe('https://cloud.example');
  });

  it('defaults ServiceConfigs to an active, zeroed-out connection state', async () => {
    const { DB_DEFAULT_CONFIGS } = await import('@web/Config/key');
    const svc = DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs;
    expect(svc.SERVICE_NAME).toBe('NexoralDNS');
    expect(svc.Service_Status).toBe('active');
    expect(svc.Connected_At).toBeNull();
    expect(svc.Total_Connected_Devices_To_Router).toBe(0);
    expect(svc.List_of_Connected_Devices_Info).toEqual([]);
  });

  it('exposes the broker port constant', async () => {
    const { ServerKeys } = await import('@web/Config/key');
    expect(ServerKeys.BROKER_PORT).toBe(56300);
  });
});
