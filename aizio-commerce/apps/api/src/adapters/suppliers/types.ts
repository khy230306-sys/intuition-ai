import type { ConnectionStatus, DataFreshness } from "../../shared/types.ts";

export interface SupplierCapabilities {
  productSearch: boolean;
  categorySearch: boolean;
  productDetail: boolean;
  variantSku: boolean;
  supplyPrice: boolean;
  inventory: boolean;
  warehouse: boolean;
  shippingCost: boolean;
  deliveryEta: boolean;
  orderCreate: boolean;
  orderQuery: boolean;
  tracking: boolean;
  dispute: boolean;
}

export interface SupplierSearchQuery {
  keyword?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}

export interface SupplierProduct {
  supplierProductId: string;
  title: string;
  imageUrl: string | null;
  category: string | null;
  priceUsd: number | null;
  sku: string | null;
  variantId: string | null;
  warehouse: string | null;
  raw: unknown;
  capturedAt: string;
  freshness: DataFreshness;
}

export interface FreightOption {
  name: string;
  priceUsd: number | null;
  aging: string | null;
  freshness: DataFreshness;
  currency?: "USD" | null;
  logisticsProductId?: string | null;
}

export interface SupplierAdapter {
  id: string;
  label: string;
  capabilities(): SupplierCapabilities;
  getStatus(): Promise<ConnectionStatus>;
  testConnection(): Promise<{ status: ConnectionStatus; error: string | null }>;
  searchProducts(query: SupplierSearchQuery): Promise<{ status: ConnectionStatus; products: SupplierProduct[]; error: string | null }>;
  getCategories(): Promise<{ status: ConnectionStatus; categories: unknown; error: string | null }>;
  getProduct(pid: string): Promise<{ status: ConnectionStatus; product: SupplierProduct | null; error: string | null }>;
  getVariants(pid: string): Promise<{ status: ConnectionStatus; variants: unknown; error: string | null }>;
  getStock(opts: { vid?: string; sku?: string }): Promise<{ status: ConnectionStatus; stock: unknown; error: string | null }>;
  getWarehouses(): Promise<{ status: ConnectionStatus; warehouses: unknown; error: string | null }>;
  getFreight(opts: { startCountryCode: string; endCountryCode: string; vid: string; quantity: number }): Promise<{ status: ConnectionStatus; options: FreightOption[]; error: string | null }>;
  createOrder(payload: unknown): Promise<{ status: ConnectionStatus; order: unknown; error: string | null }>;
  getOrder(orderId: string): Promise<{ status: ConnectionStatus; order: unknown; error: string | null }>;
  getTracking(trackNumber: string): Promise<{ status: ConnectionStatus; tracking: unknown; error: string | null }>;
  getDispute(disputeId: string): Promise<{ status: ConnectionStatus; dispute: unknown; error: string | null }>;
}
