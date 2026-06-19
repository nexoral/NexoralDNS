import os from 'os';
import { ClassBased } from 'outers';

const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKEN_TTL = '48h';

export const getJWTSecret = (): string =>
  [
    process.arch,
    process.platform,
    process.version,
    os.hostname(),
    String(os.totalmem()),
    (os.cpus()[0]?.model ?? 'cpu').replace(/\s+/g, '_'),
  ].join('::');

export const generateAccessToken = (payload: object): string => {
  const result = new ClassBased.JWT_Manager(getJWTSecret()).generate(payload, ACCESS_TOKEN_TTL);
  return result.toKen as string;
};

export const generateRefreshToken = (payload: object): string => {
  const result = new ClassBased.JWT_Manager(getJWTSecret()).generate(payload, REFRESH_TOKEN_TTL);
  return result.toKen as string;
};

export const verifyToken = (token: string): { valid: boolean; data?: Record<string, unknown> } => {
  const result = new ClassBased.JWT_Manager(getJWTSecret()).decode(token);
  if (result.status !== 'Success') return { valid: false };
  return { valid: true, data: result.data?.data as Record<string, unknown> };
};
