/* eslint-disable @typescript-eslint/no-explicit-any */
import pino from 'pino';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino/file',
    options: { destination: 1 }
  } : undefined,
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  timestamp: pino.stdTimeFunctions.isoTime,
});

function toPlain(d: any): any {
  if (d instanceof Error) return { message: d.message, stack: d.stack, name: d.name };
  if (Buffer.isBuffer(d)) return d.toString();
  return d;
}

const logger = {
  info: (msg: any, ...args: any[]) => {
    if (args.length > 0) {
      pinoLogger.info({ args: args.map(toPlain) }, String(msg));
    } else {
      pinoLogger.info(String(msg));
    }
  },
  error: (msg: any, ...args: any[]) => {
    if (args.length > 0) {
      pinoLogger.error({ err: toPlain(args[0]) }, String(msg));
    } else {
      pinoLogger.error(String(msg));
    }
  },
  warn: (msg: any, ...args: any[]) => {
    if (args.length > 0) {
      pinoLogger.warn({ args: args.map(toPlain) }, String(msg));
    } else {
      pinoLogger.warn(String(msg));
    }
  },
};

export default logger;
