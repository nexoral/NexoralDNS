import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock factories are hoisted above imports/consts, so referencing outer
// variables must go through vi.hoisted (or a `mock`-prefixed name) — a bare
// module-scope const here would throw "Cannot access before initialization".
const { pinoInstance } = vi.hoisted(() => ({
  pinoInstance: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('pino', () => {
  const pinoFactory = vi.fn(() => pinoInstance);
  return {
    default: Object.assign(pinoFactory, {
      stdTimeFunctions: { isoTime: vi.fn() },
    }),
  };
});

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs a plain string message with no extra args', async () => {
    const { default: logger } = await import('@web/utilities/logger');
    logger.info('hello world');
    expect(pinoInstance.info).toHaveBeenCalledWith('hello world');
  });

  it('coerces a non-string message via String()', async () => {
    const { default: logger } = await import('@web/utilities/logger');
    logger.info(42 as unknown as string);
    expect(pinoInstance.info).toHaveBeenCalledWith('42');
  });

  it('wraps extra args under an "args" key for info/warn', async () => {
    const { default: logger } = await import('@web/utilities/logger');
    logger.info('query', { domain: 'a.com' });
    expect(pinoInstance.info).toHaveBeenCalledWith({ args: [{ domain: 'a.com' }] }, 'query');

    logger.warn('cache issue', 'detail-1', 'detail-2');
    expect(pinoInstance.warn).toHaveBeenCalledWith({ args: ['detail-1', 'detail-2'] }, 'cache issue');
  });

  it('wraps the first extra arg under an "err" key for error (only the first arg)', async () => {
    const { default: logger } = await import('@web/utilities/logger');
    logger.error('failed', 'first', 'second-ignored');
    expect(pinoInstance.error).toHaveBeenCalledWith({ err: 'first' }, 'failed');
  });

  it('serializes an Error instance into {message, stack, name}', async () => {
    const { default: logger } = await import('@web/utilities/logger');
    const err = new TypeError('boom');
    logger.error('operation failed', err);
    expect(pinoInstance.error).toHaveBeenCalledWith(
      { err: { message: 'boom', stack: err.stack, name: 'TypeError' } },
      'operation failed'
    );
  });

  it('stringifies a Buffer argument instead of dumping raw bytes', async () => {
    const { default: logger } = await import('@web/utilities/logger');
    logger.warn('raw packet', Buffer.from('hello'));
    expect(pinoInstance.warn).toHaveBeenCalledWith({ args: ['hello'] }, 'raw packet');
  });

  it('leaves non-Error, non-Buffer args untouched', async () => {
    const { default: logger } = await import('@web/utilities/logger');
    const payload = { queryName: 'a.com', duration: 12 };
    logger.info('analytics', payload);
    expect(pinoInstance.info).toHaveBeenCalledWith({ args: [payload] }, 'analytics');
  });
});
