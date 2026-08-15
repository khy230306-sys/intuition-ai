import type { ConnectionStatus, CredentialStatus, ShippingAvailability } from "../../shared/types.ts";
import { requestJson } from "../http.ts";
import type {
  FreightOption,
  SupplierAdapter,
  SupplierCapabilities,
  SupplierProduct,
  SupplierSearchQuery,
} from "./types.ts";
import { CJTokenManager, isOfficialCjSuccess } from "./cj-token-manager.ts";
import {
  authErrorCode,
  probeErrorCode,
  redactCredentialText,
} from "./cj-errors.ts";
import {
  classifyInventory,
  classifyShipping,
  firstVariantId,
  flattenListV2,
  gradeConnection,
  maskIdentifier,
  normalizeListProduct,
  originCountryFromStock,
  parseFreightOptions,
} from "./cj-catalog.ts";
import type { RateLimitManager } from "../../data-hub/rate-limit.ts";
import { liveObserveWriteBlock } from "../../engines/safety/live-observe.ts";

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
  legacyPasswordAlias?: string;
  accessExpiry?: string;
  limiter?: RateLimitManager | null;
  onApiEvent?: (row: { provider: string; ok: boolean; status: number; error: string | null; circuit: string }) => void;
  persistTokens?: (tokens: { accessToken: string | null; refreshToken: string | null; accessExpiry: string | null }) => void;
}

export interface CjProbeResult {
  name: string;
  status: ConnectionStatus;
  error: string | null;
  httpStatus?: number | null;
  cjCode?: number | null;
  cjMessage?: string | null;
  endpoint?: string;
  requestFields?: string[];
  productId?: string | null;
  variantId?: string | null;
  capturedAt?: string;
  correlationId?: string | null;
  inventoryClass?: "READY" | "OUT_OF_STOCK" | "UNKNOWN" | "API_FAILED" | "UNSUPPORTED";
  shippingClass?: "READY" | "UNAVAILABLE" | "API_FAILED";
}

export interface CjConnectionReport {
  status: ConnectionStatus | CredentialStatus;
  lastConnectedAt: string | null;
  error: string | null;
  probes: CjProbeResult[];
  capabilities: Record<string, "READY" | "CAPABILITY" | "UNAVAILABLE" | "NOT_CONFIGURED" | "LOCKED" | "UNKNOWN">;
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
  private readonly tokens = new CJTokenManager();
  private writeEnabled: boolean;
  private limiter: RateLimitManager | null;
  private onApiEvent?: CjAuthConfig["onApiEvent"];
  private persistTokens?: CjAuthConfig["persistTokens"];
  private lastConnectionStatus: ConnectionStatus | null = null;
  private lastCapabilities: CjConnectionReport["capabilities"] | null = null;

  constructor(config: CjAuthConfig | string, apiPassword?: string, existingToken?: string) {
    if (typeof config === "string") {
      this.tokens.configure({
        apiKey: "",
        legacyPasswordAlias: apiPassword,
        accessToken: existingToken,
      });
      this.writeEnabled = false;
      this.limiter = null;
    } else {
      this.tokens.configure({
        apiKey: config.apiKey,
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        accessExpiry: config.accessExpiry,
        legacyPasswordAlias: config.legacyPasswordAlias,
      });
      this.writeEnabled = Boolean(config.writeEnabled);
      this.limiter = config.limiter ?? null;
      this.onApiEvent = config.onApiEvent;
      this.persistTokens = config.persistTokens;
    }
  }

  configure(input: {
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    accessExpiry?: string;
    legacyPasswordAlias?: string;
  }): void {
    this.tokens.configure(input);
  }

  tokenSnapshot() {
    return this.tokens.snapshot();
  }

  persistableTokens() {
    return this.tokens.persistable();
  }

  private safeError(message: string | null | undefined): string {
    return redactCredentialText(message ?? "CJ API 실패", [
      this.tokens.getApiKey(),
      this.tokens.getAccessToken(),
      this.tokens.getRefreshToken(),
    ]);
  }

  capabilities(): SupplierCapabilities {
    return { ...CAPABILITIES, orderCreate: false };
  }

  getCredentialStatus(): CredentialStatus {
    return this.tokens.currentStatus();
  }

  rememberConnection(status: string, capabilities?: Record<string, unknown> | null): void {
    if (
      status === "READY" ||
      status === "PARTIALLY_READY" ||
      status === "DEGRADED" ||
      status === "UNAVAILABLE" ||
      status === "PENDING_SETUP"
    ) {
      this.lastConnectionStatus = status;
    }
    if (capabilities && typeof capabilities.productSearch === "string") {
      this.lastCapabilities = capabilities as CjConnectionReport["capabilities"];
    }
  }

  lastProbeCapabilities() {
    return this.lastCapabilities;
  }

  async getStatus(): Promise<ConnectionStatus> {
    const status = this.tokens.currentStatus();
    if (status === "NOT_CONFIGURED") return "PENDING_SETUP";
    if (status === "READY" || status === "TOKEN_EXPIRING") {
      if (
        this.lastConnectionStatus === "PARTIALLY_READY" ||
        this.lastConnectionStatus === "DEGRADED" ||
        this.lastConnectionStatus === "UNAVAILABLE"
      ) {
        return this.lastConnectionStatus;
      }
      return this.lastConnectionStatus === "READY" ? "READY" : status === "TOKEN_EXPIRING" ? "READY" : "READY";
    }
    return status;
  }

  private mapAuthFailure(httpStatus: number, timedOut: boolean, hadToken: boolean): CredentialStatus {
    if (timedOut) return "UNAVAILABLE";
    if (httpStatus === 429) return "RATE_LIMITED";
    if (httpStatus === 401 && hadToken) return "TOKEN_EXPIRED";
    if (httpStatus === 401 || httpStatus === 403) return "AUTH_FAILED";
    return "UNAVAILABLE";
  }

  circuitState() {
    return this.limiter?.snapshot(this.id).circuit ?? "CLOSED";
  }

  async ensureToken(): Promise<{ status: CredentialStatus; error: string | null; token: string | null }> {
    if (!this.tokens.getApiKey() && !this.tokens.getAccessToken()) {
      this.tokens.setStatus("NOT_CONFIGURED");
      return { status: "NOT_CONFIGURED", error: "CJ API Key 또는 Access Token이 필요합니다.", token: null };
    }
    if (this.tokens.getAccessToken() && this.tokens.isExpired()) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed.token) return refreshed;
    }
    if (this.tokens.getAccessToken() && this.tokens.isExpiring() && (this.tokens.getRefreshToken() || this.tokens.getApiKey())) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed.token) return refreshed;
    }
    if (this.tokens.getAccessToken() && !this.tokens.isExpired()) {
      if (this.tokens.currentStatus() === "NOT_CONFIGURED") this.tokens.setStatus("READY");
      return { status: this.tokens.currentStatus(), error: null, token: this.tokens.getAccessToken() };
    }
    return this.fetchAccessToken();
  }

  private async fetchAccessToken(): Promise<{ status: CredentialStatus; error: string | null; token: string | null }> {
    if (!this.tokens.getApiKey()) {
      this.tokens.setStatus("NOT_CONFIGURED");
      return { status: "NOT_CONFIGURED", error: "CJ_API_KEY가 없습니다.", token: null };
    }
    this.tokens.setStatus("AUTHENTICATING");
    const gated = this.consumeBudget();
    if (!gated.ok) {
      this.tokens.setStatus("RATE_LIMITED");
      return { status: "RATE_LIMITED", error: gated.error, token: null };
    }
    const res = await requestJson<CjEnvelope<TokenPayload>>(`${BASE}/authentication/getAccessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: this.tokens.getApiKey() }),
    });
    const access = res.data?.data?.accessToken ?? null;
    const ok = res.ok && Boolean(access) && isOfficialCjSuccess(res.data);
    this.noteCall(ok, res.status, res.error, res.timedOut);
    if (!ok || !access) {
      const status = this.mapAuthFailure(res.status || 401, res.timedOut, false);
      this.tokens.setStatus(status === "UNAVAILABLE" && res.ok ? "AUTH_FAILED" : status);
      const code = authErrorCode({
        status: this.tokens.currentStatus(),
        httpStatus: res.status,
        timedOut: res.timedOut,
        message: res.data?.message ?? res.error,
      });
      return {
        status: this.tokens.currentStatus(),
        error: code,
        token: null,
      };
    }
    this.tokens.applyIssued({
      accessToken: access,
      accessTokenExpiryDate: res.data?.data?.accessTokenExpiryDate ?? null,
      refreshToken: res.data?.data?.refreshToken ?? null,
      refreshTokenExpiryDate: res.data?.data?.refreshTokenExpiryDate ?? null,
    });
    this.persistTokens?.(this.tokens.persistable());
    return { status: this.tokens.currentStatus(), error: null, token: access };
  }

  async refreshAccessToken(): Promise<{ status: CredentialStatus; error: string | null; token: string | null }> {
    if (!this.tokens.getRefreshToken()) {
      if (!this.tokens.getApiKey()) {
        return {
          status: this.tokens.currentStatus(),
          error: this.tokens.isExpired() ? "refresh token 없음" : null,
          token: this.tokens.getAccessToken(),
        };
      }
      this.tokens.clearAccessToken();
      this.tokens.setStatus("TOKEN_EXPIRED");
      return this.fetchAccessToken();
    }
    this.tokens.setStatus("AUTHENTICATING");
    const gated = this.consumeBudget();
    if (!gated.ok) {
      this.tokens.setStatus("RATE_LIMITED");
      return { status: "RATE_LIMITED", error: gated.error, token: null };
    }
    const res = await requestJson<CjEnvelope<TokenPayload>>(`${BASE}/authentication/refreshAccessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: this.tokens.getRefreshToken() }),
    });
    const access = res.data?.data?.accessToken ?? null;
    const ok = res.ok && Boolean(access) && isOfficialCjSuccess(res.data);
    this.noteCall(ok, res.status, res.error, res.timedOut);
    if (!ok || !access) {
      this.tokens.clearAccessToken();
      this.tokens.setStatus("TOKEN_EXPIRED");
      if (this.tokens.getApiKey()) return this.fetchAccessToken();
      return {
        status: "TOKEN_EXPIRED",
        error: authErrorCode({
          status: "TOKEN_EXPIRED",
          httpStatus: res.status,
          timedOut: res.timedOut,
          message: res.data?.message ?? res.error,
        }),
        token: null,
      };
    }
    this.tokens.applyIssued({
      accessToken: access,
      accessTokenExpiryDate: res.data?.data?.accessTokenExpiryDate ?? null,
      refreshToken: res.data?.data?.refreshToken ?? null,
      refreshTokenExpiryDate: res.data?.data?.refreshTokenExpiryDate ?? null,
    });
    this.persistTokens?.(this.tokens.persistable());
    return { status: this.tokens.currentStatus(), error: null, token: access };
  }

  private consumeBudget(): { ok: boolean; error: string | null } {
    if (!this.limiter) return { ok: true, error: null };
    const gate = this.limiter.canCall(this.id);
    if (!gate.ok) {
      this.onApiEvent?.({
        provider: this.id,
        ok: false,
        status: 429,
        error: gate.circuit === "OPEN" ? "circuit_open" : "qps_budget",
        circuit: gate.circuit,
      });
      return {
        ok: false,
        error: gate.circuit === "OPEN" ? "CJ API DEGRADED — circuit OPEN" : "CJ QPS / points budget",
      };
    }
    return { ok: true, error: null };
  }

  private noteCall(ok: boolean, status: number, error: string | null, timedOut = false, circuitOverride?: string) {
    const circuit = circuitOverride ?? this.limiter?.record(this.id, ok && !timedOut) ?? "CLOSED";
    this.onApiEvent?.({
      provider: this.id,
      ok: ok && !timedOut,
      status: timedOut ? 0 : status,
      error: timedOut ? "timeout" : error,
      circuit,
    });
  }

  private async call<T>(
    method: string,
    path: string,
    opts?: { query?: Record<string, string | number | undefined>; body?: unknown },
    retried = false,
  ): Promise<{ status: ConnectionStatus; data: T | null; error: string | null; raw: unknown }> {
    const auth = await this.ensureToken();
    if (!auth.token) {
      return {
        status: toConnection(auth.status),
        data: null as T | null,
        error: auth.error,
        raw: null,
      };
    }
    const gated = this.consumeBudget();
    if (!gated.ok) {
      this.tokens.setStatus("RATE_LIMITED");
      return {
        status: "RATE_LIMITED" as ConnectionStatus,
        data: null as T | null,
        error: gated.error,
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
      this.noteCall(false, res.status, "malformed_json");
      this.tokens.setStatus("UNAVAILABLE");
      return { status: "UNAVAILABLE" as ConnectionStatus, data: null as T | null, error: "malformed_json", raw: res };
    }
    if (res.status === 401) {
      this.noteCall(false, 401, res.data?.message ?? "token expired");
      this.tokens.clearAccessToken();
      this.tokens.setStatus("TOKEN_EXPIRED");
      if (!retried && (this.tokens.getRefreshToken() || this.tokens.getApiKey())) {
        const next = await this.ensureToken();
        if (next.token) return this.call<T>(method, path, opts, true);
      }
      return { status: "TOKEN_EXPIRED" as ConnectionStatus, data: null as T | null, error: res.data?.message ?? "token expired", raw: res };
    }
    const officialOk = res.ok && isOfficialCjSuccess(res.data);
    this.noteCall(officialOk, res.status, res.error, res.timedOut);
    if (!officialOk) {
      const status = res.timedOut
        ? "UNAVAILABLE"
        : res.status === 429
          ? "RATE_LIMITED"
          : res.status === 401 || res.status === 403
            ? "AUTH_FAILED"
            : res.status >= 500
              ? "DEGRADED"
              : "UNAVAILABLE";
      if (status === "AUTH_FAILED" || status === "RATE_LIMITED" || status === "UNAVAILABLE" || status === "DEGRADED") {
        this.tokens.setStatus(status === "DEGRADED" ? "UNAVAILABLE" : status);
      }
      return {
        status,
        data: null as T | null,
        error: this.safeError(
          res.data && typeof res.data.code === "number"
            ? `${res.data.message ?? "CJ API 실패"} (${res.data.code})`
            : (res.data?.message ?? res.error ?? "CJ API 실패"),
        ),
        raw: res,
      };
    }
    this.tokens.setStatus("READY");
    return { status: "READY" as ConnectionStatus, data: (res.data?.data ?? null) as T | null, error: null, raw: res };
  }

  async testConnection() {
    const report = await this.runConnectionTest();
    return { status: toConnection(report.status), error: report.error };
  }

  async runConnectionTest(opts?: { pauseMs?: number }): Promise<CjConnectionReport> {
    const pauseMs = opts?.pauseMs ?? 0;
    const capturedAt = new Date().toISOString();
    const probes: CjProbeResult[] = [];
    const locked = "LOCKED" as const;
    const cap: CjConnectionReport["capabilities"] = {
      productSearch: "UNAVAILABLE",
      productDetail: "UNAVAILABLE",
      inventory: "UNAVAILABLE",
      shipping: "UNAVAILABLE",
      orderApi: locked,
      tracking: locked,
      dispute: locked,
      payments: locked,
    };

    if (!this.tokens.getApiKey() && !this.tokens.getAccessToken()) {
      this.lastConnectionStatus = "PENDING_SETUP";
      return {
        status: "NOT_CONFIGURED",
        lastConnectedAt: null,
        error: "CREDENTIAL_REQUIRED",
        probes,
        capabilities: {
          productSearch: "NOT_CONFIGURED",
          productDetail: "NOT_CONFIGURED",
          inventory: "NOT_CONFIGURED",
          shipping: "NOT_CONFIGURED",
          orderApi: locked,
          tracking: locked,
          dispute: locked,
          payments: locked,
        },
      };
    }

    const auth = await this.ensureToken();
    const authCode = auth.token
      ? null
      : probeErrorCode("authentication", toConnection(auth.status)) ??
        authErrorCode({ status: auth.status, message: auth.error });
    probes.push({
      name: "authentication",
      status: toConnection(auth.status),
      error: auth.token ? null : authCode,
      endpoint: "/authentication/getAccessToken",
      requestFields: ["apiKey"],
      capturedAt,
    });
    if (!auth.token) {
      this.lastConnectionStatus = toConnection(auth.status);
      return { status: auth.status, lastConnectedAt: null, error: authCode, probes, capabilities: cap };
    }

    await sleep(pauseMs);
    const list = await this.call<{
      list?: Array<Record<string, unknown>>;
      content?: Array<Record<string, unknown>>;
    }>("GET", "/product/listV2", { query: { page: 1, size: 3 } });
    const products = flattenListV2(list.data);
    probes.push({
      name: "productSearch",
      status: list.status,
      error: list.status === "READY" ? null : probeErrorCode("productSearch", list.status),
      endpoint: "/product/listV2",
      requestFields: ["page", "size"],
      productId: maskIdentifier(products[0]?.pid),
      capturedAt,
      correlationId: envelopeRequestId(list.raw),
      httpStatus: envelopeHttp(list.raw),
      cjCode: envelopeCode(list.raw),
      cjMessage: list.error,
    });
    cap.productSearch =
      list.status === "READY" && products.length > 0 ? "READY" : list.status === "READY" ? "UNKNOWN" : "UNAVAILABLE";

    let pid = "";
    let vid: string | null = null;
    cap.productDetail = "UNAVAILABLE";

    for (const sample of products.slice(0, 3)) {
      pid = sample.pid;
      // Official listV2 `id` is the product id and must never be treated as vid.
      vid = sample.vid && sample.vid !== pid ? sample.vid : null;
      if (!pid) continue;
      await sleep(pauseMs);
      const detail = await this.call<unknown>("GET", "/product/query", { query: { pid } });
      if (detail.status === "READY") cap.productDetail = "READY";
      const detailRec =
        detail.data && typeof detail.data === "object" && !Array.isArray(detail.data)
          ? (detail.data as Record<string, unknown>)
          : null;
      if (!vid && detailRec) {
        const fromVariants = firstVariantId(detailRec.variants);
        vid = fromVariants && fromVariants !== pid ? fromVariants : null;
      }
      if (!vid) {
        await sleep(pauseMs);
        const variants = await this.getVariants(pid);
        if (variants.status === "READY" && cap.productDetail !== "READY") cap.productDetail = "READY";
        const fromQuery = firstVariantId(variants.variants);
        vid = fromQuery && fromQuery !== pid ? fromQuery : null;
      }
      if (vid && vid !== pid) break;
      vid = null;
    }

    if (vid) {
      await sleep(pauseMs);
      const stock = await this.call<unknown>("GET", "/product/stock/queryByVid", { query: { vid } });
      const inventoryApiOk = stock.status === "READY";
      const inventoryClass = classifyInventory(stock.data, inventoryApiOk);
      probes.push({
        name: "inventory",
        status: inventoryApiOk ? "READY" : stock.status,
        error: inventoryApiOk ? null : probeErrorCode("inventory", stock.status) ?? "INVENTORY_API_FAILED",
        endpoint: "/product/stock/queryByVid",
        requestFields: ["vid"],
        productId: maskIdentifier(pid),
        variantId: maskIdentifier(vid),
        capturedAt,
        correlationId: envelopeRequestId(stock.raw),
        httpStatus: envelopeHttp(stock.raw),
        cjCode: envelopeCode(stock.raw),
        cjMessage: stock.error,
        inventoryClass,
      });
      cap.inventory = inventoryApiOk ? "READY" : "UNAVAILABLE";

      const startCountryCode = originCountryFromStock(stock.data);
      await sleep(pauseMs);
      const freight = await this.call<unknown>("POST", "/logistic/freightCalculate", {
        body: {
          startCountryCode,
          endCountryCode: "KR",
          products: [{ quantity: 1, vid }],
        },
      });
      const shippingApiOk = freight.status === "READY";
      const shippingClass = classifyShipping(freight.data, shippingApiOk);
      probes.push({
        name: "shipping",
        status: shippingApiOk ? "READY" : freight.status,
        error: shippingApiOk ? null : probeErrorCode("shipping", freight.status) ?? "SHIPPING_API_FAILED",
        endpoint: "/logistic/freightCalculate",
        requestFields: ["startCountryCode", "endCountryCode", "products.vid", "products.quantity"],
        productId: maskIdentifier(pid),
        variantId: maskIdentifier(vid),
        capturedAt,
        correlationId: envelopeRequestId(freight.raw),
        httpStatus: envelopeHttp(freight.raw),
        cjCode: envelopeCode(freight.raw),
        cjMessage: freight.error,
        shippingClass,
      });
      cap.shipping = shippingApiOk ? "READY" : "UNAVAILABLE";
    } else {
      probes.push({
        name: "inventory",
        status: "UNAVAILABLE",
        error: "INVENTORY_API_FAILED",
        endpoint: "/product/stock/queryByVid",
        requestFields: ["vid"],
        productId: maskIdentifier(pid || null),
        variantId: null,
        capturedAt,
        inventoryClass: "UNKNOWN",
        cjMessage: "official listV2/product query returned no vid",
      });
      probes.push({
        name: "shipping",
        status: "UNAVAILABLE",
        error: "SHIPPING_API_FAILED",
        endpoint: "/logistic/freightCalculate",
        requestFields: ["startCountryCode", "endCountryCode", "products.vid", "products.quantity"],
        productId: maskIdentifier(pid || null),
        variantId: null,
        capturedAt,
        shippingClass: "API_FAILED",
        cjMessage: "no official vid available for freightCalculate",
      });
    }

    const authReady = Boolean(auth.token);
    const productsReady = cap.productSearch === "READY";
    const inventoryReady = cap.inventory === "READY";
    const shippingReady = cap.shipping === "READY";
    const status = gradeConnection({
      configured: true,
      authReady,
      productsReady,
      inventoryReady,
      shippingReady,
    });
    this.lastConnectionStatus = status;
    this.lastCapabilities = cap;
    if (status === "READY" || status === "PARTIALLY_READY") this.tokens.setStatus("READY");
    const failedAuth = probes.find((p) => p.name === "authentication" && p.status !== "READY");
    const error =
      failedAuth?.error ??
      (status === "READY"
        ? null
        : status === "PARTIALLY_READY"
          ? inventoryReady
            ? "SHIPPING_API_FAILED"
            : "INVENTORY_API_FAILED"
          : probeErrorCode("productSearch", cap.productSearch) ?? "PRODUCT_API_FAILED");
    return {
      status,
      lastConnectedAt: status === "READY" || status === "PARTIALLY_READY" ? new Date().toISOString() : null,
      error,
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
    const list = result.data?.content ?? result.data?.list ?? result.data;
    const products = flattenListV2(result.data ?? list)
      .filter((p) => p.pid && p.title)
      .map((p) => ({
        supplierProductId: p.pid,
        title: p.title,
        imageUrl: p.imageUrl,
        category: p.category,
        priceUsd: p.priceUsd,
        sku: p.sku,
        variantId: p.vid,
        warehouse: p.warehouse,
        raw: p.raw,
        capturedAt: new Date().toISOString(),
        freshness: "LIVE" as const,
      }));
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
    const parsed = parseFreightOptions(result.data);
    const options: FreightOption[] = parsed.map((row) => ({
      name: row.name,
      priceUsd: row.priceUsd,
      aging: row.aging,
      freshness: "LIVE",
      currency: row.currency,
      logisticsProductId: row.logisticsProductId,
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

  async createOrder(_payload: unknown) {
    void this.writeEnabled;
    const block = liveObserveWriteBlock("CREATE_ORDER");
    return {
      status: "UNAVAILABLE" as const,
      order: null,
      error: `${block.error} LIVE_OBSERVE: CJ 주문 생성은 서버에서 차단됩니다.`,
    };
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

function toConnection(status: CredentialStatus | ConnectionStatus): ConnectionStatus {
  if (status === "NOT_CONFIGURED") return "PENDING_SETUP";
  if (status === "TOKEN_EXPIRING") return "READY";
  return status;
}

function envelopeHttp(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const n = Number((raw as { status?: number }).status);
  return Number.isFinite(n) ? n : null;
}

function envelopeCode(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const data = (raw as { data?: { code?: number } }).data;
  const n = Number(data?.code);
  return Number.isFinite(n) ? n : null;
}

function envelopeRequestId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const data = (raw as { data?: { requestId?: string } }).data;
  return typeof data?.requestId === "string" ? data.requestId : null;
}

export function extractVariantId(raw: unknown): string | null {
  return firstVariantId(raw);
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
  const p = normalizeListProduct(item);
  return {
    supplierProductId: p.pid,
    title: p.title,
    imageUrl: p.imageUrl,
    category: p.category,
    priceUsd: p.priceUsd,
    sku: p.sku,
    variantId: p.vid,
    warehouse: p.warehouse,
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
