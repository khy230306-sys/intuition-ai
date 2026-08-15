import type { ConnectionStatus, CredentialStatus, ShippingAvailability } from "../../shared/types.ts";
import { mapHttpToConnection, requestJson } from "../http.ts";
import type {
  FreightOption,
  SupplierAdapter,
  SupplierCapabilities,
  SupplierProduct,
  SupplierSearchQuery,
} from "./types.ts";

const BASE = "https://developers.cjdropshipping.com/api2.0/v1";
export const CJ_DOCS_AUTH = "https://developers.cjdropshipping.cn/en/api/api2/api/auth.html";
export const CJ_DOCS_PRODUCT = "https://developers.cjdropshipping.com/en/api/api2/api/product.html";
export const CJ_DOCS_LOGISTIC = "https://developers.cjdropshipping.cn/en/api/api2/api/logistic.html";

interface CjEnvelope<T> {
  code?: number;
  result?: boolean;
  message?: string;
  data?: T;
  success?: boolean;
}

interface TokenPayload {
  accessToken?: string;
  accessTokenExpiryDate?: string;
  refreshToken?: string;
  refreshTokenExpiryDate?: string;
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

export interface CjAuthConfig {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  writeEnabled?: boolean;
}

export interface CjProbeResult {
  name: string;
  status: ConnectionStatus;
  error: string | null;
}

export interface CjConnectionReport {
  status: CredentialStatus;
  lastConnectedAt: string | null;
  error: string | null;
  probes: CjProbeResult[];
  capabilities: Record<string, "READY" | "CAPABILITY" | "UNAVAILABLE" | "NOT_CONFIGURED">;
}

/**
 * CJdropshipping API 2.0 adapter.
 * Official auth (2026): POST /authentication/getAccessToken { apiKey }
 * Docs: https://developers.cjdropshipping.cn/en/api/api2/api/auth.html
 * Subsequent calls use header CJ-Access-Token.
 * Pre-issued access tokens are also accepted.
 * Email/password is NOT part of the official v2 token endpoint.
 */
export class CjDropshippingAdapter implements SupplierAdapter {
  readonly id = "cjdropshipping";
  readonly label = "CJdropshipping";
  private apiKey: string;
  private token: string | null;
  private refreshToken: string | null;
  private tokenExpiry: string | null = null;
  private writeEnabled: boolean;
  private credentialStatus: CredentialStatus;

  constructor(config: CjAuthConfig | string, apiPassword?: string, existingToken?: string) {
    if (typeof config === "string") {
      this.apiKey = apiPassword ?? "";
      this.token = existingToken || null;
      this.refreshToken = null;
      this.writeEnabled = false;
    } else {
      this.apiKey = config.apiKey ?? "";
      this.token = config.accessToken || null;
      this.refreshToken = config.refreshToken || null;
      this.writeEnabled = Boolean(config.writeEnabled);
    }
    this.credentialStatus = this.apiKey || this.token ? "NOT_CONFIGURED" : "NOT_CONFIGURED";
    if (!this.apiKey && !this.token) this.credentialStatus = "NOT_CONFIGURED";
  }

  capabilities(): SupplierCapabilities {
    return { ...CAPABILITIES, orderCreate: this.writeEnabled };
  }

  getCredentialStatus(): CredentialStatus {
    if (!this.apiKey && !this.token) return "NOT_CONFIGURED";
    return this.credentialStatus === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : this.credentialStatus;
  }

  async getStatus(): Promise<ConnectionStatus> {
    if (!this.apiKey && !this.token) return "PENDING_SETUP";
    if (this.credentialStatus === "READY") return "READY";
    if (this.credentialStatus === "AUTH_FAILED") return "AUTH_FAILED";
    if (this.credentialStatus === "TOKEN_EXPIRED") return "TOKEN_EXPIRED";
    if (this.credentialStatus === "RATE_LIMITED") return "RATE_LIMITED";
    if (this.credentialStatus === "UNAVAILABLE") return "UNAVAILABLE";
    if (this.credentialStatus === "AUTHENTICATING") return "AUTHENTICATING";
    return "PENDING_SETUP";
  }

  private mapAuthFailure(httpStatus: number, timedOut: boolean, hadToken: boolean): CredentialStatus {
    if (timedOut) return "UNAVAILABLE";
    if (httpStatus === 429) return "RATE_LIMITED";
    if (httpStatus === 401 && hadToken) return "TOKEN_EXPIRED";
    if (httpStatus === 401 || httpStatus === 403) return "AUTH_FAILED";
    return "UNAVAILABLE";
  }

  async ensureToken(): Promise<{ status: CredentialStatus; error: string | null; token: string | null }> {
    if (!this.apiKey && !this.token) {
      this.credentialStatus = "NOT_CONFIGURED";
      return { status: "NOT_CONFIGURED", error: "CJ API Key 또는 Access Token이 필요합니다.", token: null };
    }
    if (this.token && this.tokenExpiry) {
      const exp = Date.parse(this.tokenExpiry);
      if (Number.isFinite(exp) && exp < Date.now() + 60_000) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed.token) return refreshed;
      }
    }
    if (this.token) {
      return { status: this.credentialStatus === "READY" ? "READY" : "READY", error: null, token: this.token };
    }
    return this.fetchAccessToken();
  }

  private async fetchAccessToken(): Promise<{ status: CredentialStatus; error: string | null; token: string | null }> {
    if (!this.apiKey) {
      this.credentialStatus = "NOT_CONFIGURED";
      return { status: "NOT_CONFIGURED", error: "CJ_API_KEY가 없습니다.", token: null };
    }
    this.credentialStatus = "AUTHENTICATING";
    const res = await requestJson<CjEnvelope<TokenPayload>>(`${BASE}/authentication/getAccessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: this.apiKey }),
    });
    const access = res.data?.data?.accessToken ?? null;
    if (!res.ok || !access) {
      this.credentialStatus = this.mapAuthFailure(res.status || 401, res.timedOut, false);
      return {
        status: this.credentialStatus,
        error: res.data?.message ?? res.error ?? "CJ 토큰 발급 실패",
        token: null,
      };
    }
    this.token = access;
    this.refreshToken = res.data?.data?.refreshToken ?? this.refreshToken;
    this.tokenExpiry = res.data?.data?.accessTokenExpiryDate ?? null;
    this.credentialStatus = "READY";
    return { status: "READY", error: null, token: access };
  }

  async refreshAccessToken(): Promise<{ status: CredentialStatus; error: string | null; token: string | null }> {
    if (!this.refreshToken) {
      this.credentialStatus = "TOKEN_EXPIRED";
      this.token = null;
      return this.fetchAccessToken();
    }
    this.credentialStatus = "AUTHENTICATING";
    const res = await requestJson<CjEnvelope<TokenPayload>>(`${BASE}/authentication/refreshAccessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });
    const access = res.data?.data?.accessToken ?? null;
    if (!res.ok || !access) {
      this.credentialStatus = "TOKEN_EXPIRED";
      this.token = null;
      return {
        status: "TOKEN_EXPIRED",
        error: res.data?.message ?? res.error ?? "CJ refresh token 실패",
        token: null,
      };
    }
    this.token = access;
    this.refreshToken = res.data?.data?.refreshToken ?? this.refreshToken;
    this.tokenExpiry = res.data?.data?.accessTokenExpiryDate ?? null;
    this.credentialStatus = "READY";
    return { status: "READY", error: null, token: access };
  }

  private async call<T>(
    method: string,
    path: string,
    opts?: { query?: Record<string, string | number | undefined>; body?: unknown },
  ) {
    const auth = await this.ensureToken();
    if (!auth.token) {
      return {
        status: toConnection(auth.status),
        data: null as T | null,
        error: auth.error,
        raw: null,
      };
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
      this.credentialStatus = this.credentialStatus === "READY" ? "READY" : "UNAVAILABLE";
      return { status: "UNAVAILABLE" as ConnectionStatus, data: null as T | null, error: "malformed_json", raw: res };
    }
    if (res.status === 401) {
      this.credentialStatus = "TOKEN_EXPIRED";
      return { status: "TOKEN_EXPIRED" as ConnectionStatus, data: null as T | null, error: res.data?.message ?? "token expired", raw: res };
    }
    if (!res.ok || res.data?.result === false) {
      const status = mapHttpToConnection(res.status, res.timedOut);
      if (status === "AUTH_FAILED" || status === "RATE_LIMITED" || status === "UNAVAILABLE") {
        this.credentialStatus = status;
      }
      return {
        status,
        data: null as T | null,
        error: res.data?.message ?? res.error ?? "CJ API 실패",
        raw: res,
      };
    }
    this.credentialStatus = "READY";
    return { status: "READY" as ConnectionStatus, data: (res.data?.data ?? null) as T | null, error: null, raw: res };
  }

  async testConnection() {
    const report = await this.runConnectionTest();
    return { status: toConnection(report.status), error: report.error };
  }

  async runConnectionTest(opts?: { pauseMs?: number }): Promise<CjConnectionReport> {
    const pauseMs = opts?.pauseMs ?? 0;
    const probes: CjProbeResult[] = [];
    const cap: CjConnectionReport["capabilities"] = {
      productSearch: "UNAVAILABLE",
      productDetail: "UNAVAILABLE",
      inventory: "UNAVAILABLE",
      shipping: "UNAVAILABLE",
      orderApi: this.writeEnabled ? "UNAVAILABLE" : "CAPABILITY",
      tracking: "CAPABILITY",
      dispute: "CAPABILITY",
    };

    if (!this.apiKey && !this.token) {
      return {
        status: "NOT_CONFIGURED",
        lastConnectedAt: null,
        error: "CJdropshipping — NOT_CONFIGURED",
        probes,
        capabilities: {
          productSearch: "NOT_CONFIGURED",
          productDetail: "NOT_CONFIGURED",
          inventory: "NOT_CONFIGURED",
          shipping: "NOT_CONFIGURED",
          orderApi: "CAPABILITY",
          tracking: "CAPABILITY",
          dispute: "CAPABILITY",
        },
      };
    }

    const auth = await this.ensureToken();
    probes.push({ name: "authentication", status: toConnection(auth.status), error: auth.error });
    if (!auth.token) {
      return { status: auth.status, lastConnectedAt: null, error: auth.error, probes, capabilities: cap };
    }

    await sleep(pauseMs);
    const list = await this.call<{ list?: Array<Record<string, unknown>>; content?: Array<Record<string, unknown>> }>(
      "GET",
      "/product/listV2",
      { query: { page: 1, size: 1 } },
    );
    probes.push({ name: "productSearch", status: list.status, error: list.error });
    cap.productSearch = list.status === "READY" ? "READY" : "UNAVAILABLE";

    const sample = (list.data?.content ?? list.data?.list ?? [])[0];
    const pid = sample ? String(sample.pid ?? sample.productId ?? "") : "";
    let vid: string | null = sample?.vid ? String(sample.vid) : null;

    if (pid) {
      await sleep(pauseMs);
      const detail = await this.call<Record<string, unknown>>("GET", "/product/query", { query: { pid } });
      probes.push({ name: "productDetail", status: detail.status, error: detail.error });
      cap.productDetail = detail.status === "READY" ? "READY" : "UNAVAILABLE";
      const variants = await this.getVariants(pid);
      const first = firstVariant(variants.variants);
      if (first) vid = first;
    } else {
      probes.push({ name: "productDetail", status: "UNAVAILABLE", error: "샘플 상품 없음" });
    }

    if (vid) {
      await sleep(pauseMs);
      const stock = await this.getStock({ vid });
      probes.push({ name: "inventory", status: stock.status, error: stock.error });
      cap.inventory = stock.status === "READY" ? "READY" : "UNAVAILABLE";
      await sleep(pauseMs);
      const freight = await this.getFreight({
        startCountryCode: "CN",
        endCountryCode: "KR",
        vid,
        quantity: 1,
      });
      probes.push({ name: "shipping", status: freight.status, error: freight.error });
      cap.shipping = freight.status === "READY" ? "READY" : "UNAVAILABLE";
    } else {
      probes.push({ name: "inventory", status: "UNAVAILABLE", error: "variant id 없음" });
      probes.push({ name: "shipping", status: "UNAVAILABLE", error: "variant id 없음" });
    }

    const failed = probes.find((p) => p.name === "authentication" && p.status !== "READY");
    const status: CredentialStatus = failed
      ? (failed.status as CredentialStatus)
      : probes.some((p) => p.status === "READY")
        ? "READY"
        : "UNAVAILABLE";
    this.credentialStatus = status;
    return {
      status,
      lastConnectedAt: status === "READY" ? new Date().toISOString() : null,
      error: failed?.error ?? (status === "READY" ? null : "연결 테스트 실패"),
      probes,
      capabilities: cap,
    };
  }

  async searchProducts(query: SupplierSearchQuery) {
    const pageSize = Math.min(query.pageSize ?? 20, 50);
    const result = await this.call<{ content?: Array<Record<string, unknown>>; list?: Array<Record<string, unknown>> }>(
      "GET",
      "/product/listV2",
      {
        query: {
          page: query.page ?? 1,
          size: pageSize,
          keyWord: query.keyword,
        },
      },
    );
    if (result.status !== "READY") {
      return { status: result.status, products: [], error: result.error };
    }
    const list = result.data?.content ?? result.data?.list ?? [];
    const products = list.map((item) => mapProduct(item)).filter((p) => p.supplierProductId && p.title);
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
    const product = mapProduct(result.data);
    if (!product.supplierProductId) {
      return { status: "UNAVAILABLE" as const, product: null, error: "missing SKU / empty product" };
    }
    return { status: "READY" as const, product, error: null };
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

  async quoteKoreaShipping(vid: string): Promise<{
    availability: ShippingAvailability;
    option: FreightOption | null;
    capturedAt: string;
    source: string;
  }> {
    const capturedAt = new Date().toISOString();
    const quote = await this.getFreight({
      startCountryCode: "CN",
      endCountryCode: "KR",
      vid,
      quantity: 1,
    });
    if (quote.status !== "READY") {
      return { availability: "UNKNOWN", option: null, capturedAt, source: `${CJ_DOCS_LOGISTIC}#freightCalculate` };
    }
    const priced = quote.options.filter((o) => o.priceUsd !== null);
    if (priced.length === 0 && quote.options.length === 0) {
      return { availability: "UNAVAILABLE", option: null, capturedAt, source: `${BASE}/logistic/freightCalculate` };
    }
    const best = priced.sort((a, b) => (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity))[0] ?? quote.options[0] ?? null;
    return {
      availability: best ? "AVAILABLE" : "UNAVAILABLE",
      option: best,
      capturedAt,
      source: `${BASE}/logistic/freightCalculate`,
    };
  }

  async createOrder(payload: unknown) {
    if (!this.writeEnabled) {
      return {
        status: "UNAVAILABLE" as const,
        order: null,
        error: "LIVE_OBSERVE: CJ 주문 생성은 서버에서 차단됩니다.",
      };
    }
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

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toConnection(status: CredentialStatus): ConnectionStatus {
  if (status === "NOT_CONFIGURED") return "PENDING_SETUP";
  return status;
}

function firstVariant(raw: unknown): string | null {
  if (Array.isArray(raw)) {
    const row = raw[0] as Record<string, unknown> | undefined;
    return row?.vid ? String(row.vid) : null;
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const list = obj.variants ?? obj.list ?? obj.content;
    if (Array.isArray(list) && list[0] && typeof list[0] === "object") {
      const row = list[0] as Record<string, unknown>;
      return row.vid ? String(row.vid) : null;
    }
  }
  return null;
}

export function extractVariantId(raw: unknown): string | null {
  return firstVariant(raw);
}

export function extractInventoryTotal(raw: unknown): number | null {
  if (Array.isArray(raw)) {
    let total = 0;
    let seen = false;
    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const n = Number((row as Record<string, unknown>).totalInventoryNum ?? (row as Record<string, unknown>).inventoryNum);
      if (Number.isFinite(n)) {
        total += n;
        seen = true;
      }
    }
    return seen ? total : null;
  }
  if (raw && typeof raw === "object") {
    const n = Number((raw as Record<string, unknown>).totalInventoryNum);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function mapProduct(item: Record<string, unknown>): SupplierProduct {
  const priceRaw = item.sellPrice ?? item.nowPrice ?? item.productPrice ?? item.price;
  const priceUsd = priceRaw === undefined || priceRaw === null || priceRaw === "" ? null : Number(priceRaw);
  const title = String(item.productNameEn ?? item.productName ?? item.name ?? "").trim();
  return {
    supplierProductId: String(item.pid ?? item.productId ?? item.id ?? ""),
    title,
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

export function parseOfficialAgingMax(aging: string | null): number | null {
  if (!aging) return null;
  const nums = aging.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  return Math.max(...nums.map((n) => Number(n)).filter((n) => Number.isFinite(n)));
}
