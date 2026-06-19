import RedisCache from '../Redis/Redis.cache';
import { getEventHandler } from './EventMapper.broker';

const BROKER_CHANNEL = 'broker:ip_change';

export default function createTCPBroker(): void {
  RedisCache.subscribe(BROKER_CHANNEL, (message) => {
    try {
      const parsed: { event: string; timestamp: number } = JSON.parse(message);
      const handler = getEventHandler(parsed.event);
      if (handler) {
        handler();
      } else {
        console.log(`[Broker] No handler registered for event: ${parsed.event}`);
      }
    } catch (err) {
      console.error('[Broker] Failed to process message:', err);
    }
  }).catch((err) => {
    console.error('[Broker] Failed to subscribe to channel:', err);
  });
}
