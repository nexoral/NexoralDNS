import { describe, it, expect, vi } from 'vitest';
import RequestControllerHelper from '@server/source/helper/Request_Controller.helper';

describe('RequestControllerHelper — registry primitives', () => {
  it('adds, reads, checks and removes in-flight requests', () => {
    const helper = new RequestControllerHelper();
    const p = Promise.resolve();

    helper.addRequest('k', p);
    expect(helper.hasRequest('k')).toBe(true);
    expect(helper.getRequest('k')).toBe(p);

    helper.removeRequest('k');
    expect(helper.hasRequest('k')).toBe(false);
    expect(helper.getRequest('k')).toBeUndefined();
  });
});

describe('RequestControllerHelper — executeWithDeduplication', () => {
  it('runs the executor and cleans up afterwards', async () => {
    const helper = new RequestControllerHelper();
    const executor = vi.fn().mockResolvedValue(undefined);

    await helper.executeWithDeduplication('k', executor);

    expect(executor).toHaveBeenCalledTimes(1);
    expect(helper.hasRequest('k')).toBe(false);
  });

  it('invokes onCleanup after completion', async () => {
    const helper = new RequestControllerHelper();
    const onCleanup = vi.fn();

    await helper.executeWithDeduplication('k', async () => {}, undefined, onCleanup);

    expect(onCleanup).toHaveBeenCalledWith('k');
  });

  it('deduplicates a concurrent call: the second waits and skips its executor', async () => {
    const helper = new RequestControllerHelper();
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });

    const firstExecutor = vi.fn().mockReturnValue(gate);
    const secondExecutor = vi.fn().mockResolvedValue(undefined);
    const onDuplicate = vi.fn();

    const first = helper.executeWithDeduplication('same', firstExecutor);
    const second = helper.executeWithDeduplication('same', secondExecutor, onDuplicate);

    release();
    await Promise.all([first, second]);

    expect(firstExecutor).toHaveBeenCalledTimes(1);
    expect(secondExecutor).not.toHaveBeenCalled(); // deduped
    expect(onDuplicate).toHaveBeenCalledWith('same');
  });

  it('still cleans up when the executor throws', async () => {
    const helper = new RequestControllerHelper();

    await expect(
      helper.executeWithDeduplication('k', async () => { throw new Error('boom'); }),
    ).rejects.toThrow('boom');

    expect(helper.hasRequest('k')).toBe(false);
  });
});
