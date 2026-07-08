import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * jwt.helper resolves the signing secret once and caches it in a module-level
 * variable, and its resolution has several fs branches. We reset the module
 * registry before each test and re-import with a per-test `fs` double so each
 * branch is exercised from a clean slate. `path`/`crypto`/`outers` stay real.
 */
type FsDouble = {
  readFileSync: ReturnType<typeof vi.fn>;
  writeFileSync: ReturnType<typeof vi.fn>;
  mkdirSync: ReturnType<typeof vi.fn>;
};

async function loadWithFs(fs: FsDouble) {
  vi.doMock('fs', () => ({ default: fs }));
  return import('@server/source/helper/jwt.helper');
}

beforeEach(() => {
  vi.resetModules();
});

describe('getJWTSecret', () => {
  it('reads and trims a persisted secret file when present', async () => {
    const fs: FsDouble = { readFileSync: vi.fn().mockReturnValue('  persisted-secret  '), writeFileSync: vi.fn(), mkdirSync: vi.fn() };
    const { getJWTSecret } = await loadWithFs(fs);

    expect(getJWTSecret()).toBe('persisted-secret');
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('caches the secret after first resolution (file read only once)', async () => {
    const fs: FsDouble = { readFileSync: vi.fn().mockReturnValue('cached'), writeFileSync: vi.fn(), mkdirSync: vi.fn() };
    const { getJWTSecret } = await loadWithFs(fs);

    getJWTSecret();
    getJWTSecret();
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
  });

  it('generates and persists a random 256-bit secret on first boot', async () => {
    const fs: FsDouble = {
      readFileSync: vi.fn(() => { throw new Error('ENOENT'); }),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
    };
    const { getJWTSecret } = await loadWithFs(fs);

    const secret = getJWTSecret();
    expect(secret).toMatch(/^[0-9a-f]{64}$/); // 32 random bytes as hex
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalledWith(expect.any(String), secret, { mode: 0o600, flag: 'wx' });
  });

  it('reads the winner\'s secret when another worker created it first (write EEXIST)', async () => {
    let firstRead = true;
    const fs: FsDouble = {
      readFileSync: vi.fn(() => {
        if (firstRead) { firstRead = false; throw new Error('ENOENT'); }
        return 'winner-secret';
      }),
      writeFileSync: vi.fn(() => { throw new Error('EEXIST'); }),
      mkdirSync: vi.fn(),
    };
    const { getJWTSecret } = await loadWithFs(fs);

    expect(getJWTSecret()).toBe('winner-secret');
  });

  it('falls back to the just-generated value when both write and re-read fail', async () => {
    const fs: FsDouble = {
      readFileSync: vi.fn(() => { throw new Error('ENOENT'); }),
      writeFileSync: vi.fn(() => { throw new Error('EACCES'); }),
      mkdirSync: vi.fn(),
    };
    const { getJWTSecret } = await loadWithFs(fs);

    expect(getJWTSecret()).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('token generation & verification', () => {
  async function loadWithStableSecret() {
    const fs: FsDouble = { readFileSync: vi.fn().mockReturnValue('stable-test-secret'), writeFileSync: vi.fn(), mkdirSync: vi.fn() };
    return loadWithFs(fs);
  }

  it('round-trips an access token payload through verifyToken', async () => {
    const { generateAccessToken, verifyToken } = await loadWithStableSecret();

    const token = generateAccessToken({ _id: 'u1', username: 'alice' });
    expect(typeof token).toBe('string');

    const result = verifyToken(token);
    expect(result.valid).toBe(true);
    expect(result.data).toMatchObject({ _id: 'u1', username: 'alice' });
  });

  it('generates a refresh token that also verifies', async () => {
    const { generateRefreshToken, verifyToken } = await loadWithStableSecret();

    const token = generateRefreshToken({ _id: 'u1' });
    expect(verifyToken(token).valid).toBe(true);
  });

  it('rejects a malformed / tampered token', async () => {
    const { verifyToken } = await loadWithStableSecret();
    expect(verifyToken('not-a-jwt')).toEqual({ valid: false });
  });
});
