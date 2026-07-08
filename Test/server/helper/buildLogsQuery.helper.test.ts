import { describe, it, expect } from 'vitest';
import { buildLogsQuery } from '@server/source/helper/buildLogsQuery.helper';

describe('buildLogsQuery', () => {
  it('returns an empty query for no filters', () => {
    expect(buildLogsQuery({})).toEqual({});
  });

  it('builds a case-insensitive regex match for SourceIP', () => {
    expect(buildLogsQuery({ SourceIP: '10.0.0.1' })).toEqual({
      SourceIP: { $regex: '10\\.0\\.0\\.1', $options: 'i' },
    });
  });

  it('builds a case-insensitive regex match for queryName', () => {
    expect(buildLogsQuery({ queryName: 'example.com' })).toEqual({
      queryName: { $regex: 'example\\.com', $options: 'i' },
    });
  });

  it('escapes regex metacharacters (injection-safe)', () => {
    const query = buildLogsQuery({ queryName: '.*(a|b)[x]+^$' });
    expect(query.queryName.$regex).toBe('\\.\\*\\(a\\|b\\)\\[x\\]\\+\\^\\$');
  });

  it('matches Status exactly (no regex)', () => {
    expect(buildLogsQuery({ Status: 'BLOCKED' })).toEqual({ Status: 'BLOCKED' });
  });

  it('builds a timestamp range from `from` only', () => {
    expect(buildLogsQuery({ from: '1000' })).toEqual({ timestamp: { $gte: 1000 } });
  });

  it('builds a timestamp range from `to` only', () => {
    expect(buildLogsQuery({ to: 2000 })).toEqual({ timestamp: { $lte: 2000 } });
  });

  it('builds a full timestamp range from `from` and `to`', () => {
    expect(buildLogsQuery({ from: 1000, to: 2000 })).toEqual({ timestamp: { $gte: 1000, $lte: 2000 } });
  });

  it('builds a duration range', () => {
    expect(buildLogsQuery({ durationFrom: '5', durationTo: '50' })).toEqual({
      duration: { $gte: 5, $lte: 50 },
    });
  });

  it('combines every filter into one query', () => {
    const query = buildLogsQuery({
      SourceIP: '1.2.3.4', queryName: 'x.com', Status: 'RESOLVED',
      from: 1, to: 2, durationFrom: 3, durationTo: 4,
    });
    expect(query).toEqual({
      SourceIP: { $regex: '1\\.2\\.3\\.4', $options: 'i' },
      queryName: { $regex: 'x\\.com', $options: 'i' },
      Status: 'RESOLVED',
      timestamp: { $gte: 1, $lte: 2 },
      duration: { $gte: 3, $lte: 4 },
    });
  });

  it('ignores empty-string filter values (falsy guard)', () => {
    expect(buildLogsQuery({ SourceIP: '', queryName: '', Status: '' })).toEqual({});
  });
});
