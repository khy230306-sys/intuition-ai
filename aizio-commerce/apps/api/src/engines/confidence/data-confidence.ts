export type InventoryAvailability = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";

export function classifyInventory(stock: number | null): InventoryAvailability {
  if (stock === null || !Number.isFinite(stock)) return "UNKNOWN";
  if (stock <= 0) return "OUT_OF_STOCK";
  if (stock <= 10) return "LOW_STOCK";
  return "IN_STOCK";
}

/**
 * Deterministic data confidence. LLM must not invent this number.
 */
export function scoreDataConfidence(input: {
  hasSupplierPrice: boolean;
  inventory: InventoryAvailability;
  hasShippingCost: boolean;
  shippingAvailability: string | null;
  fresh: boolean;
  riskAssessed: boolean;
  hasFx: boolean;
  hasMarketPrice: boolean;
}): number {
  let score = 0;
  if (input.hasSupplierPrice) score += 22;
  if (input.inventory === "IN_STOCK" || input.inventory === "LOW_STOCK") score += 18;
  if (input.hasShippingCost && input.shippingAvailability === "AVAILABLE") score += 18;
  if (input.fresh) score += 14;
  if (input.riskAssessed) score += 14;
  if (input.hasFx) score += 10;
  if (input.hasMarketPrice) score += 4;
  return Math.min(1, score / 100);
}
