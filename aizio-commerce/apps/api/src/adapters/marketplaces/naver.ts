import bcrypt from "bcryptjs";
import type { ConnectionStatus } from "../../shared/types.ts";
import { mapHttpToConnection, requestJson } from "../http.ts";
import type {
  ActionResult,
  ListingResult,
  MarketplaceAdapter,
  MarketplaceCapabilities,
  MarketplaceOrder,
  ReturnRequest,
} from "./types.ts";

const BASE = "https://api.commerce.naver.com/external";

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
  customerInquiry: false,
};

/**
 * Naver Commerce API adapter.
 * Official auth: https://apicenter.commerce.naver.com/docs/auth
 * Token: POST /v1/oauth2/token with bcrypt signature of client_id_timestamp using client_secret as salt.
 */
export function naverClientSecretSign(clientId: string, clientSecret: string, timestamp: number): string {
  const password = `${clientId}_${timestamp}`;
  const hashed = bcrypt.hashSync(password, clientSecret);
  return Buffer.from(hashed, "utf8").toString("base64");
}

export class NaverCommerceAdapter implements MarketplaceAdapter {
  readonly id = "naver";
  readonly label = "Naver SmartStore";
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  capabilities(): MarketplaceCapabilities {
    return CAPABILITIES;
  }

  async getStatus(): Promise<ConnectionStatus> {
    if (!this.clientId || !this.clientSecret) return "PENDING_SETUP";
    return "READY";
  }

  async ensureToken(): Promise<{ status: ConnectionStatus; error: string | null; token: string | null }> {
    if (!this.clientId || !this.clientSecret) {
      return { status: "PENDING_SETUP", error: "Naver SmartStore — PENDING_SETUP", token: null };
    }
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return { status: "READY", error: null, token: this.accessToken };
    }
    const timestamp = Date.now();
    const clientSecretSign = naverClientSecretSign(this.clientId, this.clientSecret, timestamp);
    const body = new URLSearchParams({
      client_id: this.clientId,
      timestamp: String(timestamp),
      client_secret_sign: clientSecretSign,
      grant_type: "client_credentials",
      type: "SELF",
    });
    const res = await requestJson<{ access_token?: string; expires_in?: number; message?: string }>(
      `${BASE}/v1/oauth2/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      },
    );
    if (!res.ok || !res.data?.access_token) {
      return {
        status: mapHttpToConnection(res.status || 401, res.timedOut),
        error: res.data?.message ?? res.error ?? "네이버 토큰 발급 실패",
        token: null,
      };
    }
    this.accessToken = res.data.access_token;
    this.tokenExpiresAt = Date.now() + (res.data.expires_in ?? 10800) * 1000;
    return { status: "READY", error: null, token: this.accessToken };
  }

  private async call<T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>) {
    const auth = await this.ensureToken();
    if (!auth.token) {
      return { status: auth.status, data: null as T | null, error: auth.error };
    }
    const res = await requestJson<T>(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      this.accessToken = null;
      const retryAuth = await this.ensureToken();
      if (!retryAuth.token) {
        return { status: retryAuth.status, data: null as T | null, error: retryAuth.error };
      }
      const retry = await requestJson<T>(`${BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${retryAuth.token}`,
          "Content-Type": "application/json",
          ...extraHeaders,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!retry.ok) {
        return {
          status: mapHttpToConnection(retry.status, retry.timedOut),
          data: null as T | null,
          error: retry.error ?? "Naver API 실패",
        };
      }
      return { status: "READY" as ConnectionStatus, data: retry.data, error: null };
    }
    if (res.error === "malformed_json") {
      return { status: "UNAVAILABLE" as ConnectionStatus, data: null as T | null, error: "malformed_json" };
    }
    if (!res.ok) {
      return {
        status: mapHttpToConnection(res.status, res.timedOut),
        data: null as T | null,
        error: res.error ?? `Naver HTTP ${res.status}`,
      };
    }
    return { status: "READY" as ConnectionStatus, data: res.data, error: null };
  }

  async testConnection() {
    const token = await this.ensureToken();
    return { status: token.status, error: token.error };
  }

  async createListing(payload: unknown): Promise<ListingResult> {
    const result = await this.call<{ originProductNo?: number; data?: { originProductNo?: number } }>(
      "POST",
      "/v2/products",
      payload,
    );
    const listingId =
      result.data?.originProductNo?.toString() ??
      result.data?.data?.originProductNo?.toString() ??
      null;
    return { status: result.status, listingId, error: result.error, raw: result.data };
  }

  async updateListing(listingId: string, payload: unknown): Promise<ListingResult> {
    const result = await this.call(
      "PUT",
      `/v2/products/origin-products/${encodeURIComponent(listingId)}`,
      payload,
    );
    return { status: result.status, listingId, error: result.error, raw: result.data };
  }

  async updatePrice(listingId: string, price: number): Promise<ActionResult> {
    const result = await this.call(
      "PUT",
      `/v2/products/origin-products/${encodeURIComponent(listingId)}`,
      { originProduct: { salePrice: price } },
    );
    return { status: result.status, error: result.error, raw: result.data };
  }

  async updateStock(listingId: string, quantity: number): Promise<ActionResult> {
    const result = await this.call(
      "PUT",
      `/v2/products/origin-products/${encodeURIComponent(listingId)}`,
      { originProduct: { stockQuantity: quantity } },
    );
    return { status: result.status, error: result.error, raw: result.data };
  }

  async fetchOrders(params?: Record<string, string>) {
    const from = params?.from ?? new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const to = params?.to ?? new Date().toISOString();
    const qs = new URLSearchParams({
      from,
      to,
      rangeType: params?.rangeType ?? "PAYED_DATETIME",
      productOrderStatuses: params?.productOrderStatuses ?? "PAYED",
    });
    const result = await this.call<{ data?: { contents?: Array<Record<string, unknown>> }; contents?: Array<Record<string, unknown>> }>(
      "GET",
      `/v1/pay-order/seller/product-orders?${qs.toString()}`,
    );
    if (result.status !== "READY") {
      return { status: result.status, orders: [] as MarketplaceOrder[], error: result.error };
    }
    const contents = result.data?.data?.contents ?? result.data?.contents ?? [];
    const orders: MarketplaceOrder[] = contents.map((row) => {
      const po = (row.productOrder as Record<string, unknown> | undefined) ?? row;
      return {
        marketplaceOrderId: String(po.productOrderId ?? row.productOrderId ?? ""),
        productId: po.productId ? String(po.productId) : null,
        variantId: po.optionCode ? String(po.optionCode) : null,
        quantity: Number(po.quantity ?? 1),
        saleAmount: po.totalPaymentAmount !== undefined ? Number(po.totalPaymentAmount) : null,
        status: String(po.productOrderStatus ?? "UNKNOWN"),
        shipping: (po.shippingAddress as Record<string, unknown>) ?? null,
        raw: row,
      };
    });
    return { status: "READY" as const, orders, error: null };
  }

  async confirmShipment(payload: unknown): Promise<ActionResult> {
    const result = await this.call("POST", "/v1/pay-order/seller/product-orders/dispatch", payload);
    return { status: result.status, error: result.error, raw: result.data };
  }

  async cancelOrder(_orderId: string, payload?: unknown): Promise<ActionResult> {
    const result = await this.call("POST", "/v1/pay-order/seller/product-orders/cancel", payload ?? {});
    return { status: result.status, error: result.error, raw: result.data };
  }

  async fetchReturns() {
    const from = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const to = new Date().toISOString();
    const qs = new URLSearchParams({
      from,
      to,
      rangeType: "CLAIM_REQUESTED_DATETIME",
      claimStatuses: "RETURN_REQUEST,EXCHANGE_REQUEST,CANCEL_REQUEST",
    });
    const result = await this.call<{ data?: { contents?: Array<Record<string, unknown>> }; contents?: Array<Record<string, unknown>> }>(
      "GET",
      `/v1/pay-order/seller/product-orders?${qs.toString()}`,
    );
    if (result.status !== "READY") {
      return { status: result.status, returns: [] as ReturnRequest[], error: result.error };
    }
    const contents = result.data?.data?.contents ?? result.data?.contents ?? [];
    const returns: ReturnRequest[] = contents.map((row) => {
      const po = (row.productOrder as Record<string, unknown> | undefined) ?? row;
      return {
        returnId: String(po.claimId ?? po.productOrderId ?? ""),
        orderId: po.productOrderId ? String(po.productOrderId) : null,
        status: String(po.claimStatus ?? po.productOrderStatus ?? "UNKNOWN"),
        reason: po.claimReason ? String(po.claimReason) : null,
        raw: row,
      };
    });
    return { status: "READY" as const, returns, error: null };
  }
}
