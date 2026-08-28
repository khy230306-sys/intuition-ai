import { encryptJson } from "../../crypto/pii.ts";
import type { Repository } from "../../db/repository.ts";
import type { MarketplaceOrder } from "../../adapters/marketplaces/types.ts";
import { id, nowIso } from "../../shared/ids.ts";

export function normalizeAndStoreOrder(
  repo: Repository,
  marketplace: string,
  order: MarketplaceOrder,
): string {
  const orderId = id("ord");
  const shipping = encryptJson(order.shipping ?? { present: false });
  repo.insertOrder({
    id: orderId,
    marketplace,
    marketplaceOrderId: order.marketplaceOrderId,
    productId: order.productId,
    variantId: order.variantId,
    quantity: order.quantity,
    saleAmount: order.saleAmount ?? 0,
    shipping,
    orderStatus: order.status,
    fulfillmentStatus: "UNFULFILLED",
    createdAt: nowIso(),
  });
  return orderId;
}
