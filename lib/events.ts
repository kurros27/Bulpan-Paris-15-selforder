import { EventEmitter } from "node:events";

/**
 * Bus d'événements en mémoire pour le temps réel (SSE).
 * Chaque restaurant possède son canal `restaurant:{id}`.
 *
 * NB : en déploiement multi-instances, remplacer par un adaptateur
 * Redis Pub/Sub — l'API publish/subscribe reste identique.
 */
const globalForEvents = globalThis as unknown as { orderBus?: EventEmitter };

export const orderBus =
  globalForEvents.orderBus ??
  (() => {
    const bus = new EventEmitter();
    bus.setMaxListeners(0);
    return bus;
  })();

globalForEvents.orderBus = orderBus;

export type RealtimeEvent =
  | { kind: "order.created"; order: unknown }
  | { kind: "order.updated"; order: unknown }
  | { kind: "notification"; notification: unknown };

export function publishToRestaurant(restaurantId: string, event: RealtimeEvent) {
  orderBus.emit(`restaurant:${restaurantId}`, event);
}

export function subscribeToRestaurant(
  restaurantId: string,
  listener: (event: RealtimeEvent) => void
) {
  const channel = `restaurant:${restaurantId}`;
  orderBus.on(channel, listener);
  return () => orderBus.off(channel, listener);
}
