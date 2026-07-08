import { describe, it, expect, vi, beforeEach } from 'vitest';

const { containerMock, verifyTokenMock } = vi.hoisted(() => ({
  containerMock: { get: vi.fn() },
  verifyTokenMock: vi.fn(),
}));
vi.mock('@server/source/container/appContainer', () => ({ default: containerMock }));
vi.mock('@server/source/helper/jwt.helper', () => ({ verifyToken: verifyTokenMock }));

import { authGuard } from '@server/source/Middlewares/authGuard.middleware';
import { createFakeReply } from '../_testUtils/fakeReply';
import { createFakeRequest } from '../_testUtils/fakeRequest';

function setup() {
  const tokenExtractor = { extract: vi.fn() };
  const sessionStore = { getSession: vi.fn() };
  containerMock.get.mockImplementation((key: string) => {
    if (key === 'TokenExtractor') return tokenExtractor;
    if (key === 'SessionStore') return sessionStore;
    throw new Error(`unexpected key ${key}`);
  });
  return { tokenExtractor, sessionStore };
}

beforeEach(() => vi.clearAllMocks());

describe('authGuard.isAuthenticated', () => {
  it('rejects with 401 when no token is present', async () => {
    const { tokenExtractor } = setup();
    tokenExtractor.extract.mockReturnValue(null);
    const req = createFakeRequest();
    const fake = createFakeReply();

    await authGuard.isAuthenticated(req as any, fake.reply);

    expect(fake.statusCode).toBe(401);
    expect(fake.body).toMatchObject({ data: expect.stringMatching(/provide a valid token/) });
    expect((req as any).user).toBeUndefined();
  });

  it('rejects with 401 when the token fails verification', async () => {
    const { tokenExtractor } = setup();
    tokenExtractor.extract.mockReturnValue('tok');
    verifyTokenMock.mockReturnValue({ valid: false });
    const fake = createFakeReply();

    await authGuard.isAuthenticated(createFakeRequest() as any, fake.reply);

    expect(fake.statusCode).toBe(401);
    expect(fake.body).toMatchObject({ data: expect.stringMatching(/invalid or expired/) });
  });

  it('rejects with 401 when no active session exists', async () => {
    const { tokenExtractor, sessionStore } = setup();
    tokenExtractor.extract.mockReturnValue('tok');
    verifyTokenMock.mockReturnValue({ valid: true, data: { _id: 'u1' } });
    sessionStore.getSession.mockResolvedValue(null);
    const fake = createFakeReply();

    await authGuard.isAuthenticated(createFakeRequest() as any, fake.reply);

    expect(fake.statusCode).toBe(401);
    expect(fake.body).toMatchObject({ data: expect.stringMatching(/Session expired/) });
  });

  it('rejects with 401 when the session is logged out', async () => {
    const { tokenExtractor, sessionStore } = setup();
    tokenExtractor.extract.mockReturnValue('tok');
    verifyTokenMock.mockReturnValue({ valid: true, data: { _id: 'u1' } });
    sessionStore.getSession.mockResolvedValue({ isLoggedIn: false });
    const fake = createFakeReply();

    await authGuard.isAuthenticated(createFakeRequest() as any, fake.reply);

    expect(fake.statusCode).toBe(401);
  });

  it('attaches the decoded user and sends nothing on success', async () => {
    const { tokenExtractor, sessionStore } = setup();
    tokenExtractor.extract.mockReturnValue('tok');
    verifyTokenMock.mockReturnValue({ valid: true, data: { _id: 'u1', username: 'alice' } });
    sessionStore.getSession.mockResolvedValue({ isLoggedIn: true });
    const req = createFakeRequest();
    const fake = createFakeReply();

    await authGuard.isAuthenticated(req as any, fake.reply);

    expect(fake.sent).toBe(false);
    expect((req as any).user).toEqual({ _id: 'u1', username: 'alice' });
  });
});
