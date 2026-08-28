import type { ConnectionStatus } from "../../shared/types.ts";
import { mapHttpToConnection, requestJson } from "../http.ts";
import {
  coupangAuthorization,
  type ActionResult,
  type ListingResult,
  type MarketplaceAdapter,
  type MarketplaceCapabilities,
  type MarketplaceOrder,
  type ReturnRequest,
} from "./types.ts";

const HOST = "https://api-gateway.coupang.com";

const CAPABILITIES: MarketplaceCapabilities = {
  productCreate: true,
  productUpdate: true,
  priceUpdate: true,
  stockUpdate: true,
  orderRead: true,
  shipmentUpdate: true,
  cancelOrder: true,
  returnRead: true,
  returnAutomation: false,
  customerInquiry: true,
};

/**
 * Coupang Wing Open API adapter.
 * Official: https://developers.coupang.com/en/api
 * Auth: HMAC-SHA256 CEA header + X-Requested-By vendorId
 */
export class CoupangAdapter implements MarketplaceAdapter {
  readonly id = "coupang";
  readonly label = "Coupang";

  constructor(
    private readonly accessKey: string,
    private readonly secretKey: string,
    private readonly vendorId: string,
  ) {}

  capabilities(): MarketplaceCapabilities {
    return CAPABILITIES;
  }

  async getStatus(): Promise<ConnectionStatus> {
    if (!this.accessKey || !this.secretKey || !this.vendorId) return "PENDING_SETUP";
    return "READY";
  }

  private async call<T>(method: string, path: string, body?: unknown) {
    if (!this.accessKey || !this.secretKey || !this.vendorId) {
      return { status: "PENDING_SETUP" as ConnectionStatus, data: null as T | null, error: "Coupang — PENDING_SETUP", http: 0 };
    }
    const auth = coupangAuthorization(method, path, this.secretKey, this.accessKey);
    const res = await requestJson<T>(`${HOST}${path}`, {
      method,
      headers: {
        Authorization: auth,
        "X-Requested-By": this.vendorId,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.error === "malformed_json") {
      return { status: "UNAVAILABLE" as ConnectionStatus, data: null as T | null, error: "malformed_json", http: res.status };
    }
    if (!res.ok) {
      return {
        status: mapHttpToConnection(res.status, res.timedOut),
        data: null as T | null,
        error: res.error ?? `Coupang HTTP ${res.status}`,
        http: res.status,
      };
    }
    return { status: "READY" as ConnectionStatus, data: res.data, error: null, http: res.status };
  }

  async testConnection() {
    const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products?vendorId=${encodeURIComponent(this.vendorId)}&maxPerPage=1`;
    const result = await this.call<unknown>("GET", path);
    return { status: result.status, error: result.error };
  }

  async createListing(payload: unknown): Promise<ListingResult> {
    const result = await this.call<{ data?: { sellerProductId?: string } }>(
      "POST",
      "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products",
      payload,
    );
    return {
      status: result.status,
      listingId: result.data?.data?.sellerProductId ?? null,
      error: result.error,
      raw: result.data,
    };
  }

  async updateListing(_listingId: string, payload: unknown): Promise<ListingResult> {
    const result = await this.call<{ data?: { sellerProductId?: string } }>(
      "PUT",
      "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products",
      payload,
    );
    return {
      status: result.status,
      listingId: result.data?.data?.sellerProductId ?? _listingId,
      error: result.error,
      raw: result.data,
    };
  }

  async updatePrice(vendorItemId: string, price: number): Promise<ActionResult> {
    const result = await this.call(
      "PUT",
      `/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/${encodeURIComponent(vendorItemId)}/prices/${price}`,
    );
    return { status: result.status, error: result.error, raw: result.data };
  }

  async updateStock(vendorItemId: string, quantity: number): Promise<ActionResult> {
    const result = await this.call(
      "PUT",
      `/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/${encodeURIComponent(vendorItemId)}/quantities/${quantity}`,
    );
    return { status: result.status, error: result.error, raw: result.data };
  }

  async fetchOrders(params?: Record<string, string>) {
    const createdAtFrom = params?.createdAtFrom;
    const createdAtTo = params?.createdAtTo;
    if (!createdAtFrom || !createdAtTo) {
      return {
        status: "UNAVAILABLE" as ConnectionStatus,
        orders: [] as MarketplaceOrder[],
        error: "Coupang 주문 조회는 createdAtFrom, createdAtTo가 필요합니다.",
      };
    }
    const qs = new URLSearchParams({
      createdAtFrom,
      createdAtTo,
      maxPerPage: params?.maxPerPage ?? "50",
    });
    const path = `/v2/providers/openapi/apis/api/v5/vendors/${encodeURIComponent(this.vendorId)}/ordersheets?${qs.toString()}`;
    const result = await this.call<{ data?: Array<Record<string, unknown>> }>("GET", path);
    if (result.status !== "READY") {
      return { status: result.status, orders: [], error: result.error };
    }
    const orders: MarketplaceOrder[] = (result.data?.data ?? []).map((row) => ({
      marketplaceOrderId: String(row.orderId ?? row.shipmentBoxId ?? ""),
      productId: row.sellerProductId ? String(row.sellerProductId) : null,
      variantId: row.vendorItemId ? String(row.vendorItemId) : null,
      quantity: Number(row.shippingCount ?? row.orderCount ?? 1),
      saleAmount: row.orderPrice !== undefined ? Number(row.orderPrice) : null,
      status: String(row.status ?? "UNKNOWN"),
      shipping: (row.receiver as Record<string, unknown>) ?? null,
      raw: row,
    }));
    return { status: "READY" as const, orders, error: null };
  }

  async confirmShipment(payload: unknown): Promise<ActionResult> {
    const result = await this.call(
      "POST",
      `/v2/providers/openapi/apis/api/v4/vendors/${encodeURIComponent(this.vendorId)}/orders/invoices`,
      payload,
    );
    return { status: result.status, error: result.error, raw: result.data };
  }

  async cancelOrder(orderId: string, payload?: unknown): Promise<ActionResult> {
    const result = await this.call(
      "POST",
      `/v2/providers/openapi/apis/api/v5/vendors/${encodeURIComponent(this.vendorId)}/orders/${encodeURIComponent(orderId)}/cancel`,
      payload ?? {},
    );
    return { status: result.status, error: result.error, raw: result.data };
  }

  async fetchReturns() {
    const path = `/v2/providers/openapi/apis/api/v6/vendors/${encodeURIComponent(this.vendorId)}/returnRequests?searchType=CREATED&maxPerPage=50`;
    const result = await this.call<{ data?: Array<Record<string, unknown>> }>("GET", path);
    if (result.status !== "READY") {
      return { status: result.status, returns: [] as ReturnRequest[], error: result.error };
    }
    const returns: ReturnRequest[] = (result.data?.data ?? []).map((row) => ({
      returnId: String(row.receiptId ?? row.returnId ?? ""),
      orderId: row.orderId ? String(row.orderId) : null,
      status: String(row.receiptStatus ?? "UNKNOWN"),
      reason: row.returnReason ? String(row.returnReason) : null,
      raw: row,
    }));
    return { status: "READY" as const, returns, error: null };
  }

  async respondToCustomerInquiry(inquiryId: string, message: string): Promise<ActionResult> {
    const result = await this.call(
      "POST",
      `/v2/providers/openapi/apis/api/v4/vendors/${encodeURIComponent(this.vendorId)}/onlineInquiries/${encodeURIComponent(inquiryId)}/replies`,
      { content: message },
    );
    return { status: result.status, error: result.error, raw: result.data };
  }
}
