import { describe, it, expect, vi } from 'vitest';

const { execFileMock } = vi.hoisted(() => ({ execFileMock: vi.fn() }));
vi.mock('child_process', () => ({ execFile: execFileMock }));

import { pingIP } from '@server/source/helper/IP_Ping.helper';

// execFile is invoked as execFile(cmd, args, callback); resolve via the last arg
// so the double doesn't depend on the exact callback position.
function respondWith(err: Error | null) {
  execFileMock.mockImplementation((...args: unknown[]) => {
    const cb = args[args.length - 1] as (e: Error | null) => void;
    cb(err);
  });
}

describe('pingIP', () => {
  it('resolves true when ping exits successfully', async () => {
    respondWith(null);
    expect(await pingIP('10.0.0.1')).toBe(true);
  });

  it('resolves false when ping errors (host unreachable)', async () => {
    respondWith(new Error('unreachable'));
    expect(await pingIP('10.0.0.2')).toBe(false);
  });

  it('invokes ping via an argument array (no shell → injection-safe)', async () => {
    respondWith(null);
    await pingIP('1.2.3.4');
    expect(execFileMock).toHaveBeenCalledWith('ping', ['-c', '1', '-W', '1', '1.2.3.4'], expect.any(Function));
  });
});
