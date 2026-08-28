export type Freshness =
  | "LIVE"
  | "ESTIMATE"
  | "STALE"
  | "INSUFFICIENT_DATA"
  | "UNKNOWN"
  | "NOT_CONNECTED";

export interface Product {
  id: string;
  supplier: string;
  title: string;
  status: string;
  category: string | null;
  imageUrl: string | null;
  supplierPriceKrw: number | null;
  shippingKrw: number | null;
  recommendedPriceKrw: number | null;
  stock: number | null;
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
  dashboard: () =>
    req<{
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
      note: string | null;
    }>("/api/dashboard"),
  products: (q = "") => req<{ products: Product[] }>(`/api/products${q}`),
  product: (id: string) => req<{ product: Product }>(`/api/products/${id}`),
  scout: (keyword?: string) => req<{ jobId: string }>("/api/products/scout", { method: "POST", body: JSON.stringify({ keyword }) }),
  approve: (id: string, body: object = {}) =>
    req(`/api/products/${id}/approve`, { method: "POST", body: JSON.stringify(body) }),
  pause: (id: string) => req(`/api/products/${id}/pause`, { method: "POST" }),
  orders: () => req<{ orders: Array<Record<string, unknown>> }>("/api/orders"),
  audit: () => req<{ entries: Array<Record<string, unknown>> }>("/api/audit"),
  jobs: () => req<{ jobs: Array<Record<string, unknown>> }>("/api/jobs"),
  integrations: () => req<{ integrations: Array<Record<string, unknown>>; ai: Array<Record<string, unknown>> }>("/api/integrations"),
  testIntegration: (id: string) => req(`/api/integrations/${id}/test`, { method: "POST" }),
  safety: () => req<Record<string, unknown>>("/api/settings/safety"),
  saveSafety: (body: unknown) => req("/api/settings/safety", { method: "PUT", body: JSON.stringify(body) }),
  command: (text: string) => req("/api/command", { method: "POST", body: JSON.stringify({ text }) }),
  vision: (imageBase64: string, mimeType: string) =>
    req("/api/vision", { method: "POST", body: JSON.stringify({ imageBase64, mimeType }) }),
};
