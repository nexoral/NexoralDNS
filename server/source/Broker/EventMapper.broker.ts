// Services
import { fetchConnectedIP } from "../CronJob/Connected_IP_fetcher.cron";

// This File is Responsible for mapping events from the broker to appropriate handlers
const Events = new Map<string, Function>();

export function registerEvent(eventName: string, handler: Function) {
  Events.set(eventName, handler);
}

export function getEventHandler(eventName: string): Function | undefined {
  return Events.get(eventName);
}

export function getAllEvents(): Map<string, Function> {
  return Events;
}



// Onload default events
registerEvent('INVOKE_IP_FETCH', fetchConnectedIP);