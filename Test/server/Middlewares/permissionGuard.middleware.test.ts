import { describe, it, expect, vi } from 'vitest';
import PermissionGuard from '@server/source/Middlewares/permissionGuard.middleware';
import { createFakeReply } from '../_testUtils/fakeReply';
import { createFakeRequest } from '../_testUtils/fakeRequest';

const FULL_ACCESS = 4;

describe('PermissionGuard.canAccess', () => {
  it('rejects with 403 when no user is attached to the request', async () => {
    const guard = PermissionGuard.canAccess(2);
    const req = createFakeRequest(); // no user
    const fake = createFakeReply();
    const done = vi.fn();

    await guard(req as any, fake.reply, done);

    expect(fake.statusCode).toBe(403);
    expect(done).not.toHaveBeenCalled();
  });

  it('allows a user holding the Full Access permission regardless of required codes', async () => {
    const guard = PermissionGuard.canAccess(2, 3);
    const req = createFakeRequest({ user: { permissionCodes: [FULL_ACCESS] } });
    const fake = createFakeReply();
    const done = vi.fn();

    await guard(req as any, fake.reply, done);

    expect(done).toHaveBeenCalledTimes(1);
    expect(fake.sent).toBe(false);
  });

  it('allows a user holding one of the required permissions', async () => {
    const guard = PermissionGuard.canAccess(2, 5);
    const req = createFakeRequest({ user: { permissionCodes: [5] } });
    const fake = createFakeReply();
    const done = vi.fn();

    await guard(req as any, fake.reply, done);

    expect(done).toHaveBeenCalledTimes(1);
    expect(fake.sent).toBe(false);
  });

  it('rejects with 403 and lists required codes when the user lacks permission', async () => {
    const guard = PermissionGuard.canAccess(2, 3);
    const req = createFakeRequest({ user: { permissionCodes: [7] } });
    const fake = createFakeReply();
    const done = vi.fn();

    await guard(req as any, fake.reply, done);

    expect(fake.statusCode).toBe(403);
    expect(fake.body).toMatchObject({ data: expect.stringMatching(/Required permissions: 2, 3/) });
    expect(done).not.toHaveBeenCalled();
  });

  it('treats a missing/invalid permissionCodes field as no permissions', async () => {
    const guard = PermissionGuard.canAccess(2);
    const req = createFakeRequest({ user: {} }); // no permissionCodes
    const fake = createFakeReply();
    const done = vi.fn();

    await guard(req as any, fake.reply, done);

    expect(fake.statusCode).toBe(403);
    expect(done).not.toHaveBeenCalled();
  });
});
