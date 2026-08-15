export type Freshness =
  | "LIVE"
  | "ESTIMATE"
  | "MANUAL"
  | "STALE"
  | "INSUFFICIENT_DATA"
  | "UNKNOWN"
  | "NOT_CONNECTED";

export interface ScoutCounts {
  analyzed: number;
  koreaShippable: number;
  riskExcluded: number;
  profitCalculable: number;
  recommended: number;
}

export interface Product {
  id: string;
  supplier: string;
  supplierProductId?: string | null;
  supplierVariantId?: string | null;
  title: string;
  status: string;
  category: string | null;
  imageUrl: string | null;
  supplierPriceKrw: number | null;
  supplierPriceUsd?: number | null;
  shippingKrw: number | null;
  shippingUsd?: number | null;
  shippingAvailability?: string | null;
  shippingMethod?: string | null;
  recommendedPriceKrw: number | null;
  targetMarginPriceKrw?: number | null;
  marketObservedPriceKrw?: number | null;
  sellingPriceKind?: string | null;
  profitStage?: string | null;
  stock: number | null;
  warehouse?: string | null;
  capturedAt?: string | null;
  confidence: number | null;
  profit: {
    sellingPrice: number;
    productCost: number;
    internationalShipping: number;
    totalCost: number;
    expectedNetProfit: number;
    netMarginRate: number;
    confidence: number;
    missingInputs: string[];
    inputFreshness: Record<string, Freshness>;
    calculatedAt: string;
    stage?: string;
    sellingPriceKind?: string;
  } | null;
  risk: { decision: string; score: number; findings: Array<{ label: string; severity: string; evidence: string }> } | null;
  decision: {
    status: string;
    compositeScore: number;
    scores: Record<string, { score: number; reason: string }>;
    reasons: string[];
    warnings: string[];
  } | null;
  market: { freshness: string; medianPrice: number | null; competitorCount: number | null; source: string } | null;
  sourceFacts: Record<string, unknown>;
  updatedAt: string;
}

export interface Dashboard {
  analyzedToday: number;
  candidates: number;
  recommended: number;
  live: number;
  ordersToday: number;
  autoProcessed: number;
  reviewNeeded: number;
  expectedNetProfit: number;
  actualNetProfit: number;
  pendingSetupCount: number;
  operatingMode?: string;
  cjStatus?: string;
  scout?: {
    cjReady: boolean;
    lastRun: (ScoutCounts & { createdAt: string; keyword: string | null }) | null;
    counts: ScoutCounts;
  };
  note: string | null;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = (await res.json()) as T;
  if (!res.ok) throw Object.assign(new Error("request_failed"), { status: res.status, data });
  return data;
}

export const api = {
  dashboard: () => req<Dashboard>("/api/dashboard"),
  products: (q = "") => req<{ products: Product[] }>(`/api/products${q}`),
  product: (id: string) => req<{ product: Product }>(`/api/products/${id}`),
  productHistory: (id: string) =>
    req<{
      price: Array<{ price: number; currency: string; capturedAt: string }>;
      inventory: Array<{ stock: number; warehouse: string | null; capturedAt: string }>;
      shipping: Array<{ availability: string; method: string | null; cost: number | null; capturedAt: string }>;
    }>(`/api/products/${id}/history`),
  scout: (keyword?: string) =>
    req<{ jobId: string; status?: string; message?: string }>("/api/products/scout", {
      method: "POST",
      body: JSON.stringify({ keyword }),
    }),
  approve: (id: string, body: object = {}) =>
    req(`/api/products/${id}/approve`, { method: "POST", body: JSON.stringify(body) }),
  pause: (id: string) => req(`/api/products/${id}/pause`, { method: "POST" }),
  orders: () => req<{ orders: Array<Record<string, unknown>> }>("/api/orders"),
  audit: () => req<{ entries: Array<Record<string, unknown>> }>("/api/audit"),
  jobs: () => req<{ jobs: Array<Record<string, unknown>> }>("/api/jobs"),
  integrations: () => req<{ integrations: Array<Record<string, unknown>>; ai: Array<Record<string, unknown>> }>("/api/integrations"),
  testIntegration: (id: string) => req<Record<string, unknown>>(`/api/integrations/${id}/test`, { method: "POST" }),
  safety: () => req<Record<string, unknown>>("/api/settings/safety"),
  saveSafety: (body: unknown) => req("/api/settings/safety", { method: "PUT", body: JSON.stringify(body) }),
  command: (text: string) => req("/api/command", { method: "POST", body: JSON.stringify({ text }) }),
  vision: (imageBase64: string, mimeType: string) =>
    req("/api/vision", { method: "POST", body: JSON.stringify({ imageBase64, mimeType }) }),
};
