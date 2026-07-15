import { describe, it, expect, vi, beforeEach } from 'vitest';

const { containerMock } = vi.hoisted(() => ({ containerMock: { get: vi.fn() } }));
vi.mock('@server/source/container/appContainer', () => ({ default: containerMock }));

import LogsService from '@server/source/Services/Logs/Logs.service';

function setup() {
  const aggregate = vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
  const collection = { aggregate };
  const mongoMgr = { getCollection: vi.fn().mockReturnValue(collection) };
  containerMock.get.mockReturnValue(mongoMgr);
  const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() } as never;
  return { aggregate, reply };
}

beforeEach(() => vi.clearAllMocks());

describe('LogsService.getAnalyticalLogs sort order', () => {
  it('defaults to descending _id (newest first) with no order given', async () => {
    const { aggregate, reply } = setup();
    await new LogsService().getAnalyticalLogs(10, undefined, {}, reply);
    const pipeline = aggregate.mock.calls[0][0];
    expect(pipeline).toContainEqual({ $sort: { _id: -1 } });
  });

  it('sorts descending and cursors with $lt when order is "desc"', async () => {
    const { aggregate, reply } = setup();
    await new LogsService().getAnalyticalLogs(10, '507f1f77bcf86cd799439011', {}, reply, 'desc');
    const pipeline = aggregate.mock.calls[0][0];
    expect(pipeline).toContainEqual({ $sort: { _id: -1 } });
    expect(pipeline[0].$match._id.$lt.toHexString()).toBe('507f1f77bcf86cd799439011');
  });

  it('sorts ascending and cursors with $gt when order is "asc"', async () => {
    const { aggregate, reply } = setup();
    await new LogsService().getAnalyticalLogs(10, '507f1f77bcf86cd799439011', {}, reply, 'asc');
    const pipeline = aggregate.mock.calls[0][0];
    expect(pipeline).toContainEqual({ $sort: { _id: 1 } });
    expect(pipeline[0].$match._id.$gt.toHexString()).toBe('507f1f77bcf86cd799439011');
  });
});
