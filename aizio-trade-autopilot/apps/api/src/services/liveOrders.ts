import { env } from '../config/env.js';
import { getTossBroker } from '../brokers/index.js';

/**
 * Continuous LIVE lock check — call before every LIVE placeOrder.
 * Sticky unlock from a one-shot diagnostics run is not enough.
 */
export function assertLiveOrdersAllowed(): void {
  if (!env.ALLOW_LIVE) {
    // Force lock even if someone flipped in-memory flag
    getTossBroker().allowLiveOrders = false;
    throw new Error('LIVE_ORDERS_LOCKED: ALLOW_LIVE=false');
  }
  const toss = getTossBroker();
  if (!toss.allowLiveOrders) {
    throw new Error('LIVE_ORDERS_LOCKED: live gate not READY');
  }
}

export function refreshLiveOrderLock(ready: boolean): void {
  getTossBroker().allowLiveOrders = Boolean(ready && env.ALLOW_LIVE);
}
