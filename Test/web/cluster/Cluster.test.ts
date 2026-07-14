import { describe, it, expect, vi, beforeEach } from 'vitest';
import os from 'os';

const { clusterMock, handlerMock, loadOrGenerateCertsMock, loggerMock } = vi.hoisted(() => ({
  clusterMock: {
    isPrimary: true,
    schedulingPolicy: undefined as unknown,
    SCHED_RR: 'SCHED_RR_MARKER',
    fork: vi.fn(),
  },
  handlerMock: vi.fn(),
  loadOrGenerateCertsMock: vi.fn(),
  loggerMock: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('cluster', () => ({ default: clusterMock }));
vi.mock('@web/Config/DNS', () => ({ default: handlerMock }));
vi.mock('@web/services/DNS/DNS_DoT.Service', () => ({ loadOrGenerateCerts: loadOrGenerateCertsMock }));
vi.mock('nexoraldns-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nexoraldns-shared')>();
  return { ...actual, logger: loggerMock };
});

function cpus(n: number) {
  return new Array(n).fill({}) as os.CpuInfo[];
}

async function importFresh() {
  vi.resetModules();
  const { default: startCluster } = await import('@web/cluster/Cluster');
  return startCluster;
}

describe('Cluster module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clusterMock.isPrimary = true;
    clusterMock.schedulingPolicy = undefined;
    loadOrGenerateCertsMock.mockReset();
  });

  it('sets round-robin scheduling policy at import time', async () => {
    vi.spyOn(os, 'cpus').mockReturnValue(cpus(4));
    await importFresh();
    expect(clusterMock.schedulingPolicy).toBe('SCHED_RR_MARKER');
  });

  it('logs the computed worker count (75% of CPUs, min 1) at import time', async () => {
    vi.spyOn(os, 'cpus').mockReturnValue(cpus(8)); // 8*0.75=6
    await importFresh();
    expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('6 workers'));
  });

  it('does not fork or start the handler merely by being imported (self-exec guard)', async () => {
    vi.spyOn(os, 'cpus').mockReturnValue(cpus(4));
    await importFresh();
    expect(clusterMock.fork).not.toHaveBeenCalled();
    expect(handlerMock).not.toHaveBeenCalled();
  });

  it('primary process pre-generates DoT certs once, then forks one worker per usable CPU', async () => {
    vi.spyOn(os, 'cpus').mockReturnValue(cpus(4)); // 4*0.75=3
    clusterMock.isPrimary = true;
    const startCluster = await importFresh();
    await startCluster();
    expect(loadOrGenerateCertsMock).toHaveBeenCalledTimes(1);
    expect(clusterMock.fork).toHaveBeenCalledTimes(3);
    expect(handlerMock).not.toHaveBeenCalled();
  });

  it('still forks all workers even when cert pre-generation throws', async () => {
    vi.spyOn(os, 'cpus').mockReturnValue(cpus(4));
    clusterMock.isPrimary = true;
    loadOrGenerateCertsMock.mockImplementation(() => {
      throw new Error('openssl not found');
    });
    const startCluster = await importFresh();
    await expect(startCluster()).resolves.toBeUndefined();
    expect(clusterMock.fork).toHaveBeenCalledTimes(3);
  });

  it('always forks at least 1 worker even with very few CPUs', async () => {
    vi.spyOn(os, 'cpus').mockReturnValue(cpus(1)); // floor(1*0.75)=0 -> max(1,0)=1
    clusterMock.isPrimary = true;
    const startCluster = await importFresh();
    await startCluster();
    expect(clusterMock.fork).toHaveBeenCalledTimes(1);
  });

  it('worker processes run the DNS handler instead of forking', async () => {
    vi.spyOn(os, 'cpus').mockReturnValue(cpus(4));
    clusterMock.isPrimary = false;
    const startCluster = await importFresh();
    await startCluster();
    expect(handlerMock).toHaveBeenCalledTimes(1);
    expect(clusterMock.fork).not.toHaveBeenCalled();
    expect(loadOrGenerateCertsMock).not.toHaveBeenCalled();
  });
});;