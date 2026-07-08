import { describe, it, expect, vi, beforeEach } from 'vitest';

const { infoSpy, errorSpy, warnSpy } = vi.hoisted(() => ({
  infoSpy: vi.fn(), errorSpy: vi.fn(), warnSpy: vi.fn(),
}));

vi.mock('pino', () => {
  const pino: any = vi.fn(() => ({ info: infoSpy, error: errorSpy, warn: warnSpy }));
  pino.stdTimeFunctions = { isoTime: () => ',"time":"iso"' };
  return { default: pino };
});

import logger from '@server/source/utilities/logger';

describe('logger', () => {
  beforeEach(() => { infoSpy.mockClear(); errorSpy.mockClear(); warnSpy.mockClear(); });

  it('info/warn log the bare message when no args are given', () => {
    logger.info('hello');
    logger.warn('careful');
    expect(infoSpy).toHaveBeenCalledWith('hello');
    expect(warnSpy).toHaveBeenCalledWith('careful');
  });

  it('info/warn wrap extra args under { args }', () => {
    logger.info('m', { a: 1 }, 'b');
    expect(infoSpy).toHaveBeenCalledWith({ args: [{ a: 1 }, 'b'] }, 'm');
  });

  it('coerces a non-string message to string', () => {
    logger.warn(99 as unknown as string);
    expect(warnSpy).toHaveBeenCalledWith('99');
  });

  it('error logs the bare message with no args', () => {
    logger.error('failed');
    expect(errorSpy).toHaveBeenCalledWith('failed');
  });

  it('error serialises an Error to a plain { message, stack, name }', () => {
    const err = new Error('boom');
    logger.error('op failed', err);
    expect(errorSpy).toHaveBeenCalledWith({ err: { message: 'boom', stack: err.stack, name: 'Error' } }, 'op failed');
  });

  it('toPlain stringifies a Buffer arg', () => {
    logger.info('buf', Buffer.from('abc'));
    expect(infoSpy).toHaveBeenCalledWith({ args: ['abc'] }, 'buf');
  });

  it('toPlain passes plain values through unchanged', () => {
    logger.warn('nums', 1, true, null);
    expect(warnSpy).toHaveBeenCalledWith({ args: [1, true, null] }, 'nums');
  });
});
