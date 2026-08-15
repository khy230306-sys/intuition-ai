import { createHmac } from "node:crypto";
import type { ConnectionStatus } from "../../shared/types.ts";

export interface MarketplaceCapabilities {
  productCreate: boolean;
  productUpdate: boolean;
  priceUpdate: boolean;
  stockUpdate: boolean;
  orderRead: boolean;
  shipmentUpdate: boolean;
  cancelOrder: boolean;
  returnRead: boolean;
  returnAutomation: boolean;
  customerInquiry: boolean;
}

export interface ListingResult {
  status: ConnectionStatus;
  listingId: string | null;
  error: string | null;
  raw?: unknown;
}

export interface ActionResult {
  status: ConnectionStatus;
  error: string | null;
  raw?: unknown;
}

export interface MarketplaceOrder {
  marketplaceOrderId: string;
  productId: string | null;
  variantId: string | null;
  quantity: number;
  saleAmount: number | null;
  status: string;
  shipping: Record<string, unknown> | null;
  raw: unknown;
}

export interface ReturnRequest {
  returnId: string;
  orderId: string | null;
  status: string;
  reason: string | null;
  raw: unknown;
}

export interface MarketplaceAdapter {
  id: string;
  label: string;
  capabilities(): MarketplaceCapabilities;
  getStatus(): Promise<ConnectionStatus>;
  testConnection(): Promise<{ status: ConnectionStatus; error: string | null }>;
  createListing(payload: unknown): Promise<ListingResult>;
  updateListing(listingId: string, payload: unknown): Promise<ListingResult>;
  updatePrice(itemId: string, price: number): Promise<ActionResult>;
  updateStock(itemId: string, quantity: number): Promise<ActionResult>;
  fetchOrders(params?: Record<string, string>): Promise<{ status: ConnectionStatus; orders: MarketplaceOrder[]; error: string | null }>;
  confirmShipment(payload: unknown): Promise<ActionResult>;
  cancelOrder(orderId: string, payload?: unknown): Promise<ActionResult>;
  fetchReturns(): Promise<{ status: ConnectionStatus; returns: ReturnRequest[]; error: string | null }>;
  respondToCustomerInquiry?(inquiryId: string, message: string): Promise<ActionResult>;
}

export function coupangAuthorization(
  method: string,
  pathWithQuery: string,
  secretKey: string,
  accessKey: string,
  now = new Date(),
): string {
  const [path, query = ""] = pathWithQuery.split("?");
  const datetime = formatCoupangDate(now);
  const message = `${datetime}${method}${path}${query}`;
  const signature = createHmac("sha256", secretKey).update(message).digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

export function formatCoupangDate(now: Date): string {
  const iso = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return iso.slice(2);
}
