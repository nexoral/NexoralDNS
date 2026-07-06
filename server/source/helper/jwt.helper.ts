import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ClassBased } from 'outers';

const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKEN_TTL = '48h';

const SECRET_FILE = '/etc/nexoral/jwt.secret';

// Resolved once per process, then reused. A random secret is preferred over the
// old machine-attribute derivation (which was low-entropy and forgeable).
let cachedSecret: string | null = null;

/**
 * Returns the JWT signing secret, resolved once and cached:
 *   1. a persisted secret file (/etc/nexoral/jwt.secret) if it exists, else
 *   2. first boot: generate a random 256-bit secret and persist it atomically.
 *
 * The `wx` write flag makes first-boot generation race-safe across cluster
 * workers — only one wins; the losers catch EEXIST and read the winner's value.
 */
export const getJWTSecret = (): string => {
  if (cachedSecret) return cachedSecret;

  try {
    cachedSecret = fs.readFileSync(SECRET_FILE, 'utf-8').trim();
    if (cachedSecret) return cachedSecret;
  } catch {
    // file missing — generate below
  }

  const generated = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600, flag: 'wx' });
    cachedSecret = generated;
  } catch {
    // Another worker created it first (EEXIST) or dir not writable — read theirs,
    // else fall back to the just-generated value for this process.
    try {
      cachedSecret = fs.readFileSync(SECRET_FILE, 'utf-8').trim() || generated;
    } catch {
      cachedSecret = generated;
    }
  }

  return cachedSecret;
};

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
