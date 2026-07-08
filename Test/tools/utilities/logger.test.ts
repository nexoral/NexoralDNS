import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture the spies the mocked pino logger will expose, so we can assert exactly
// what our thin wrapper forwards to pino.
const { infoSpy, errorSpy, warnSpy } = vi.hoisted(() => ({
  infoSpy: vi.fn(),
  errorSpy: vi.fn(),
  warnSpy: vi.fn(),
}));

vi.mock('pino', () => {
  const pino: any = vi.fn(() => ({ info: infoSpy, error: errorSpy, warn: warnSpy }));
  pino.stdTimeFunctions = { isoTime: () => ',"time":"iso"' };
  return { default: pino };
});

import logger from '@tools/source/utilities/logger';

describe('logger', () => {
  beforeEach(() => {
    infoSpy.mockClear();
    errorSpy.mockClear();
    warnSpy.mockClear();
  });

  describe('info', () => {
    it('logs just the message string when no extra args are given', () => {
      logger.info('hello');
      expect(infoSpy).toHaveBeenCalledWith('hello');
    });

    it('coerces a non-string message to a string', () => {
      logger.info(42 as unknown as string);
      expect(infoSpy).toHaveBeenCalledWith('42');
    });

    it('wraps extra args under an { args } field', () => {
      logger.info('msg', { a: 1 }, 'two');
      expect(infoSpy).toHaveBeenCalledWith({ args: [{ a: 1 }, 'two'] }, 'msg');
    });
  });

  describe('warn', () => {
    it('logs just the message when no args are given', () => {
      logger.warn('careful');
      expect(warnSpy).toHaveBeenCalledWith('careful');
    });

    it('wraps extra args under an { args } field', () => {
      logger.warn('msg', 'detail');
      expect(warnSpy).toHaveBeenCalledWith({ args: ['detail'] }, 'msg');
    });
  });

  describe('error', () => {
    it('logs just the message when no args are given', () => {
      logger.error('failed');
      expect(errorSpy).toHaveBeenCalledWith('failed');
    });

    it('serialises an Error arg to a plain { message, stack, name } object', () => {
      const err = new Error('kaboom');
      logger.error('op failed', err);
      expect(errorSpy).toHaveBeenCalledWith(
        { err: { message: 'kaboom', stack: err.stack, name: 'Error' } },
        'op failed',
      );
    });

    it('only forwards the first arg as err (extra args are ignored)', () => {
      logger.error('op failed', 'primary', 'ignored');
      expect(errorSpy).toHaveBeenCalledWith({ err: 'primary' }, 'op failed');
    });
  });

  describe('toPlain (via forwarded args)', () => {
    it('stringifies a Buffer arg', () => {
      logger.info('buf', Buffer.from('abc'));
      expect(infoSpy).toHaveBeenCalledWith({ args: ['abc'] }, 'buf');
    });

    it('passes plain values through unchanged', () => {
      logger.warn('nums', 1, true, null);
      expect(warnSpy).toHaveBeenCalledWith({ args: [1, true, null] }, 'nums');
    });
  });
});
