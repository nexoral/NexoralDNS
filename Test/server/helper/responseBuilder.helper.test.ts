import { describe, it, expect } from 'vitest';
import ResponseSender from '@server/source/helper/responseBuilder.helper';
import { createFakeReply } from '../_testUtils/fakeReply';

describe('ResponseSender', () => {
  it('sends a default 200/"Success" envelope when nothing is configured', () => {
    const fake = createFakeReply();
    new ResponseSender(fake.reply).send({ id: 1 });

    expect(fake.statusCode).toBe(200);
    expect(fake.body).toEqual({ statusCode: 200, message: 'Success', data: { id: 1 } });
  });

  it('uses constructor status/message when send() args are omitted', () => {
    const fake = createFakeReply();
    new ResponseSender(fake.reply, 404, 'Not found').send({ x: 1 });

    expect(fake.statusCode).toBe(404);
    expect(fake.body).toMatchObject({ statusCode: 404, message: 'Not found' });
  });

  it('lets explicit send() args override the instance values', () => {
    const fake = createFakeReply();
    new ResponseSender(fake.reply, 400, 'ctor msg').send('payload', 401, 'arg msg');

    expect(fake.statusCode).toBe(401);
    expect(fake.body).toEqual({ statusCode: 401, message: 'arg msg', data: 'payload' });
  });

  it('supports the setter chaining API', () => {
    const fake = createFakeReply();
    new ResponseSender(fake.reply).setStatusCode(201).setMessage('Created').setData({ ok: true }).send(undefined);

    expect(fake.statusCode).toBe(201);
    expect(fake.body).toEqual({ statusCode: 201, message: 'Created', data: { ok: true } });
  });

  it('normalises a falsy data payload to null in the body', () => {
    const fake = createFakeReply();
    new ResponseSender(fake.reply).send(undefined);
    expect(fake.body).toMatchObject({ data: null });
  });

  it('falls back to instance data when send(data) is nullish', () => {
    const fake = createFakeReply();
    new ResponseSender(fake.reply).setData({ fromInstance: true }).send(null);
    expect(fake.body).toMatchObject({ data: { fromInstance: true } });
  });
});
