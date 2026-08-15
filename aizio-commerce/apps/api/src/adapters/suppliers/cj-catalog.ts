export type InventoryClass = "READY" | "OUT_OF_STOCK" | "UNKNOWN" | "API_FAILED" | "UNSUPPORTED";
export type ShippingClass = "READY" | "UNAVAILABLE" | "API_FAILED";
export type CjConnectionGrade = "READY" | "PARTIALLY_READY" | "DEGRADED" | "PENDING_SETUP" | "UNAVAILABLE";

export interface NormalizedCjProduct {
  pid: string;
  title: string;
  sku: string | null;
  vid: string | null;
  imageUrl: string | null;
  category: string | null;
  priceUsd: number | null;
  warehouse: string | null;
  weightGrams: number | null;
  raw: Record<string, unknown>;
}

export interface ParsedStockRow {
  vid: string | null;
  areaEn: string | null;
  countryCode: string | null;
  totalInventoryNum: number | null;
}

export interface ParsedFreightOption {
  name: string;
  priceUsd: number | null;
  aging: string | null;
  currency: "USD" | null;
  logisticsProductId: string | null;
}

export function maskIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (v.length <= 8) return `${v.slice(0, 2)}…`;
  return `${v.slice(0, 8)}…${v.slice(-4)}`;
}

export function objectKeys(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.keys(value as Record<string, unknown>).sort();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function normalizeListProduct(item: Record<string, unknown>): NormalizedCjProduct {
  const pid = str(item.pid) ?? str(item.id) ?? str(item.productId) ?? "";
  const price = num(item.sellPrice ?? item.nowPrice ?? item.productPrice ?? item.price ?? item.discountPrice);
  return {
    pid,
    title: str(item.productNameEn) ?? str(item.nameEn) ?? str(item.productName) ?? str(item.name) ?? "",
    sku: str(item.productSku) ?? str(item.sku) ?? str(item.spu),
    vid: str(item.vid),
    imageUrl: str(item.productImage) ?? str(item.bigImage) ?? str(item.image),
    category: str(item.categoryName) ?? str(item.threeCategoryName),
    priceUsd: price,
    warehouse: str(item.defaultArea) ?? str(item.areaEn),
    weightGrams: num(item.variantWeight ?? item.productWeight ?? item.packingWeight ?? item.weight),
    raw: item,
  };
}

/**
 * Official 2026 listV2: data.content[].productList[] with `id` (not pid) and no vid.
 * Legacy/test mocks: data.list[] with pid/vid.
 */
export function flattenListV2(data: unknown): NormalizedCjProduct[] {
  const root = asRecord(data);
  if (!root) return [];
  const out: NormalizedCjProduct[] = [];

  if (Array.isArray(root.list)) {
    for (const row of root.list) {
      const rec = asRecord(row);
      if (rec) out.push(normalizeListProduct(rec));
    }
    return out.filter((p) => p.pid);
  }

  const content = root.content;
  if (!Array.isArray(content)) return [];
  for (const block of content) {
    const rec = asRecord(block);
    if (!rec) continue;
    if (Array.isArray(rec.productList)) {
      for (const row of rec.productList) {
        const product = asRecord(row);
        if (product) out.push(normalizeListProduct(product));
      }
    } else if (rec.pid || rec.id || rec.productId) {
      out.push(normalizeListProduct(rec));
    }
  }
  return out.filter((p) => p.pid);
}

export function extractVariantRows(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) {
    return raw.map(asRecord).filter((row): row is Record<string, unknown> => Boolean(row));
  }
  const rec = asRecord(raw);
  if (!rec) return [];
  const nested = rec.variants ?? rec.list ?? rec.content;
  if (Array.isArray(nested)) {
    return nested.map(asRecord).filter((row): row is Record<string, unknown> => Boolean(row));
  }
  if (str(rec.vid)) return [rec];
  return [];
}

export function firstVariantId(raw: unknown): string | null {
  for (const row of extractVariantRows(raw)) {
    const vid = str(row.vid) ?? str(row.variantId) ?? str(row.vidPid);
    if (vid) return vid;
  }
  return null;
}

export function parseStockRows(raw: unknown): ParsedStockRow[] {
  const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const out: ParsedStockRow[] = [];
  for (const row of rows) {
    const rec = asRecord(row);
    if (!rec) continue;
    out.push({
      vid: str(rec.vid),
      areaEn: str(rec.areaEn),
      countryCode: str(rec.countryCode),
      totalInventoryNum: num(rec.totalInventoryNum ?? rec.storageNum ?? rec.inventoryNum),
    });
  }
  return out;
}

export function classifyInventory(raw: unknown, apiOk: boolean): InventoryClass {
  if (!apiOk) return "API_FAILED";
  const rows = parseStockRows(raw);
  if (rows.length === 0) return "UNKNOWN";
  const totals = rows.map((r) => r.totalInventoryNum).filter((n): n is number => n !== null);
  if (totals.length === 0) return "UNKNOWN";
  const sum = totals.reduce((a, b) => a + b, 0);
  return sum <= 0 ? "OUT_OF_STOCK" : "READY";
}

export function originCountryFromStock(raw: unknown): string {
  const row = parseStockRows(raw).find((r) => r.countryCode);
  return row?.countryCode ?? "CN";
}

export function parseFreightOptions(raw: unknown): ParsedFreightOption[] {
  const blocks = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const out: ParsedFreightOption[] = [];
  for (const block of blocks) {
    const rec = asRecord(block);
    if (!rec) continue;
    if (Array.isArray(rec.logisticsInfoList)) {
      for (const item of rec.logisticsInfoList) {
        const row = asRecord(item);
        if (!row) continue;
        const price = num(row.logisticPrice ?? row.postage ?? row.logisticFee);
        out.push({
          name: str(row.logisticName) ?? str(row.logisticsName) ?? "UNKNOWN",
          priceUsd: price,
          aging: str(row.logisticAging) ?? str(row.aging),
          currency: price !== null ? "USD" : null,
          logisticsProductId: str(row.id) ?? str(row.logisticsProductId),
        });
      }
      continue;
    }
    const price = num(rec.logisticPrice ?? rec.postage);
    if (str(rec.logisticName) || price !== null || str(rec.logisticAging)) {
      out.push({
        name: str(rec.logisticName) ?? "UNKNOWN",
        priceUsd: price,
        aging: str(rec.logisticAging),
        currency: price !== null ? "USD" : null,
        logisticsProductId: str(rec.id) ?? str(rec.logisticsProductId),
      });
    }
  }
  return out;
}

export function classifyShipping(raw: unknown, apiOk: boolean): ShippingClass {
  if (!apiOk) return "API_FAILED";
  const options = parseFreightOptions(raw);
  return options.length > 0 ? "READY" : "UNAVAILABLE";
}

export function gradeConnection(opts: {
  configured: boolean;
  authReady: boolean;
  productsReady: boolean;
  inventoryReady: boolean;
  shippingReady: boolean;
  degraded?: boolean;
}): CjConnectionGrade {
  if (!opts.configured) return "PENDING_SETUP";
  if (!opts.authReady) return "UNAVAILABLE";
  if (opts.degraded) return "DEGRADED";
  if (opts.authReady && opts.productsReady && opts.inventoryReady && opts.shippingReady) return "READY";
  if (opts.authReady && opts.productsReady) return "PARTIALLY_READY";
  return "UNAVAILABLE";
}

export function scoutCapsReady(caps: Record<string, unknown> | null | undefined, status: string): boolean {
  if (status !== "READY") return false;
  if (!caps) return false;
  const products = caps.productSearch ?? caps.products;
  return products === "READY" && caps.inventory === "READY" && caps.shipping === "READY";
}
