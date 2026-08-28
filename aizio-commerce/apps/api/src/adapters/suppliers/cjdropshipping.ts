import type { ConnectionStatus } from "../../shared/types.ts";
import { mapHttpToConnection, requestJson } from "../http.ts";
import type {
  FreightOption,
  SupplierAdapter,
  SupplierCapabilities,
  SupplierProduct,
  SupplierSearchQuery,
} from "./types.ts";

const BASE = "https://developers.cjdropshipping.com/api2.0/v1";

interface CjEnvelope<T> {
  code?: number;
  result?: boolean;
  message?: string;
  data?: T;
  success?: boolean;
}

const CAPABILITIES: SupplierCapabilities = {
  productSearch: true,
  categorySearch: true,
  productDetail: true,
  variantSku: true,
  supplyPrice: true,
  inventory: true,
  warehouse: true,
  shippingCost: true,
  deliveryEta: true,
  orderCreate: true,
  orderQuery: true,
  tracking: true,
  dispute: true,
};

/**
 * CJdropshipping API 2.0 adapter.
 * Official docs: https://developers.cjdropshipping.com/en/api/api2/api/product.html
 * Auth: POST /authentication/getAccessToken (email + API password)
 * or pre-issued CJ-Access-Token.
 */
export class CjDropshippingAdapter implements SupplierAdapter {
  readonly id = "cjdropshipping";
  readonly label = "CJdropshipping";
  private token: string | null;
  private tokenFetchedAt = 0;

  constructor(
    private readonly email: string,
    private readonly apiPassword: string,
    existingToken: string,
  ) {
    this.token = existingToken || null;
  }

  capabilities(): SupplierCapabilities {
    return CAPABILITIES;
  }

  async getStatus(): Promise<ConnectionStatus> {
    if (!this.email && !this.token) return "PENDING_SETUP";
    if (!this.token && !(this.email && this.apiPassword)) return "PENDING_SETUP";
    return "READY";
  }

  private async ensureToken(): Promise<{ status: ConnectionStatus; error: string | null; token: string | null }> {
    if (this.token && Date.now() - this.tokenFetchedAt < 12 * 60 * 60 * 1000) {
      return { status: "READY", error: null, token: this.token };
    }
    if (this.token && !this.email) {
      return { status: "READY", error: null, token: this.token };
    }
    if (!this.email || !this.apiPassword) {
      if (this.token) return { status: "READY", error: null, token: this.token };
      return { status: "PENDING_SETUP", error: "CJ_EMAIL / CJ_API_PASSWORD 또는 CJ_ACCESS_TOKEN 필요", token: null };
    }
    const res = await requestJson<CjEnvelope<{ accessToken?: string }>>(
      `${BASE}/authentication/getAccessToken`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.email, password: this.apiPassword }),
      },
    );
    const access = res.data?.data?.accessToken ?? null;
    if (!res.ok || !access) {
      return {
        status: mapHttpToConnection(res.status || 401, res.timedOut),
        error: res.data?.message ?? res.error ?? "CJ 토큰 발급 실패",
        token: null,
      };
    }
    this.token = access;
    this.tokenFetchedAt = Date.now();
    return { status: "READY", error: null, token: access };
  }

  private async call<T>(
    method: string,
    path: string,
    opts?: { query?: Record<string, string | number | undefined>; body?: unknown },
  ) {
    const auth = await this.ensureToken();
    if (!auth.token) {
      return { status: auth.status, data: null as T | null, error: auth.error, raw: null };
    }
    const url = new URL(`${BASE}${path}`);
    if (opts?.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
      }
    }
    const res = await requestJson<CjEnvelope<T>>(url.toString(), {
      method,
      headers: {
        "CJ-Access-Token": auth.token,
        "Content-Type": "application/json",
      },
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    });
    if (res.error === "malformed_json") {
      return { status: "UNAVAILABLE" as ConnectionStatus, data: null as T | null, error: "malformed_json", raw: res };
    }
    if (!res.ok || res.data?.result === false) {
      return {
        status: mapHttpToConnection(res.status, res.timedOut),
        data: null as T | null,
        error: res.data?.message ?? res.error ?? "CJ API 실패",
        raw: res,
      };
    }
    return { status: "READY" as ConnectionStatus, data: (res.data?.data ?? null) as T | null, error: null, raw: res };
  }

  async testConnection() {
    if ((await this.getStatus()) === "PENDING_SETUP") {
      return { status: "PENDING_SETUP" as const, error: "CJdropshipping — PENDING_SETUP" };
    }
    const result = await this.call<unknown>("GET", "/setting/get");
    return { status: result.status, error: result.error };
  }

  async searchProducts(query: SupplierSearchQuery) {
    const result = await this.call<{ content?: Array<Record<string, unknown>>; list?: Array<Record<string, unknown>> }>(
      "GET",
      "/product/listV2",
      {
        query: {
          page: query.page ?? 1,
          size: query.pageSize ?? 20,
          keyWord: query.keyword,
        },
      },
    );
    if (result.status !== "READY") {
      return { status: result.status, products: [], error: result.error };
    }
    const list = result.data?.content ?? result.data?.list ?? [];
    const products = list.map((item) => mapProduct(item));
    return { status: "READY" as const, products, error: null };
  }

  async getCategories() {
    const result = await this.call<unknown>("GET", "/product/getCategory");
    return { status: result.status, categories: result.data, error: result.error };
  }

  async getProduct(pid: string) {
    const result = await this.call<Record<string, unknown>>("GET", "/product/query", { query: { pid } });
    if (result.status !== "READY") return { status: result.status, product: null, error: result.error };
    if (!result.data) return { status: "UNAVAILABLE" as const, product: null, error: "missing SKU / empty product" };
    return { status: "READY" as const, product: mapProduct(result.data), error: null };
  }

  async getVariants(pid: string) {
    const result = await this.call<unknown>("GET", "/product/variant/query", { query: { pid } });
    return { status: result.status, variants: result.data, error: result.error };
  }

  async getStock(opts: { vid?: string; sku?: string }) {
    if (opts.vid) {
      const result = await this.call<unknown>("GET", "/product/stock/queryByVid", { query: { vid: opts.vid } });
      return { status: result.status, stock: result.data, error: result.error };
    }
    if (opts.sku) {
      const result = await this.call<unknown>("GET", "/product/stock/queryBySku", { query: { sku: opts.sku } });
      return { status: result.status, stock: result.data, error: result.error };
    }
    return { status: "UNAVAILABLE" as const, stock: null, error: "vid 또는 sku 필요" };
  }

  async getWarehouses() {
    const result = await this.call<unknown>("GET", "/product/globalWarehouseList");
    return { status: result.status, warehouses: result.data, error: result.error };
  }

  async getFreight(opts: { startCountryCode: string; endCountryCode: string; vid: string; quantity: number }) {
    const result = await this.call<Array<Record<string, unknown>>>("POST", "/logistic/freightCalculate", {
      body: {
        startCountryCode: opts.startCountryCode,
        endCountryCode: opts.endCountryCode,
        products: [{ quantity: opts.quantity, vid: opts.vid }],
      },
    });
    if (result.status !== "READY") return { status: result.status, options: [], error: result.error };
    const options: FreightOption[] = (result.data ?? []).map((row) => ({
      name: String(row.logisticName ?? "UNKNOWN"),
      priceUsd: typeof row.logisticPrice === "number" ? row.logisticPrice : Number(row.logisticPrice ?? NaN) || null,
      aging: row.logisticAging ? String(row.logisticAging) : null,
      freshness: "LIVE",
    }));
    return { status: "READY" as const, options, error: null };
  }

  async createOrder(payload: unknown) {
    const result = await this.call<unknown>("POST", "/shopping/order/createOrderV3", { body: payload });
    return { status: result.status, order: result.data, error: result.error };
  }

  async getOrder(orderId: string) {
    const result = await this.call<unknown>("GET", "/shopping/order/getOrderDetail", { query: { orderId } });
    return { status: result.status, order: result.data, error: result.error };
  }

  async getTracking(trackNumber: string) {
    const result = await this.call<unknown>("GET", "/logistic/trackInfo", { query: { trackNumber } });
    return { status: result.status, tracking: result.data, error: result.error };
  }

  async getDispute(disputeId: string) {
    const result = await this.call<unknown>("GET", "/disputes/getDisputeDetail", { query: { disputeId } });
    return { status: result.status, dispute: result.data, error: result.error };
  }
}

function mapProduct(item: Record<string, unknown>): SupplierProduct {
  const priceRaw = item.sellPrice ?? item.nowPrice ?? item.productPrice ?? item.price;
  const priceUsd = priceRaw === undefined || priceRaw === null ? null : Number(priceRaw);
  return {
    supplierProductId: String(item.pid ?? item.productId ?? item.id ?? ""),
    title: String(item.productNameEn ?? item.productName ?? item.name ?? "제목 없음"),
    imageUrl: (item.productImage ?? item.bigImage ?? item.image) ? String(item.productImage ?? item.bigImage ?? item.image) : null,
    category: item.categoryName ? String(item.categoryName) : null,
    priceUsd: Number.isFinite(priceUsd as number) ? (priceUsd as number) : null,
    sku: item.productSku ? String(item.productSku) : item.sku ? String(item.sku) : null,
    variantId: item.vid ? String(item.vid) : null,
    warehouse: item.defaultArea ? String(item.defaultArea) : null,
    raw: item,
    capturedAt: new Date().toISOString(),
    freshness: "LIVE",
  };
}
