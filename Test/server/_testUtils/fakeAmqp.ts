import { EventEmitter } from 'node:events';
import { vi } from 'vitest';

/** Fake of an amqplib `Channel`. */
export class FakeAmqpChannel extends EventEmitter {
  assertQueue = vi.fn().mockResolvedValue({ queue: 'q', messageCount: 0, consumerCount: 0 });
  checkQueue = vi.fn().mockResolvedValue({ queue: 'q', messageCount: 0, consumerCount: 0 });
  purgeQueue = vi.fn().mockResolvedValue({ messageCount: 0 });
  deleteQueue = vi.fn().mockResolvedValue({ messageCount: 0 });
  sendToQueue = vi.fn().mockReturnValue(true);
  prefetch = vi.fn().mockResolvedValue(undefined);
  consume = vi.fn().mockResolvedValue({ consumerTag: 'tag-1' });
  ack = vi.fn();
  nack = vi.fn();
  close = vi.fn().mockResolvedValue(undefined);
}

/** Fake of an amqplib `Connection`. */
export class FakeAmqpConnection extends EventEmitter {
  public channel: FakeAmqpChannel;

  constructor(channel = new FakeAmqpChannel()) {
    super();
    this.channel = channel;
  }

  createChannel = vi.fn().mockImplementation(async () => this.channel);
  close = vi.fn().mockResolvedValue(undefined);
}

export function createFakeAmqp() {
  const channel = new FakeAmqpChannel();
  const connection = new FakeAmqpConnection(channel);
  return { channel, connection };
}
