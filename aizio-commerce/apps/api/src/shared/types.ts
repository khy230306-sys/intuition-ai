export const DATA_FRESHNESS = [
  "LIVE",
  "ESTIMATE",
  "MANUAL",
  "STALE",
  "INSUFFICIENT_DATA",
  "UNKNOWN",
  "NOT_CONNECTED",
] as const;
export type DataFreshness = (typeof DATA_FRESHNESS)[number];

export const CONNECTION_STATUS = [
  "READY",
  "NOT_CONFIGURED",
  "PENDING_SETUP",
  "AUTHENTICATING",
  "AUTH_FAILED",
  "TOKEN_EXPIRED",
  "RATE_LIMITED",
  "DEGRADED",
  "UNAVAILABLE",
  "NOT_CONNECTED",
] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUS)[number];

export const CREDENTIAL_STATUS = [
  "NOT_CONFIGURED",
  "AUTHENTICATING",
  "READY",
  "TOKEN_EXPIRING",
  "AUTH_FAILED",
  "TOKEN_EXPIRED",
  "RATE_LIMITED",
  "UNAVAILABLE",
] as const;
export type CredentialStatus = (typeof CREDENTIAL_STATUS)[number];

export const OPERATING_MODES = ["LIVE_OBSERVE", "LIVE_TRADE"] as const;
export type OperatingMode = (typeof OPERATING_MODES)[number];

export const PROFIT_STAGES = [
  "PRELIMINARY_MARGIN",
  "ESTIMATED_PROFIT",
  "VERIFIED_EXPECTED_PROFIT",
  "ACTUAL_PROFIT",
] as const;
export type ProfitStage = (typeof PROFIT_STAGES)[number];

export const FX_STATUSES = ["LIVE", "MANUAL_RATE", "FX_RATE_NOT_CONFIGURED"] as const;
export type FxStatus = (typeof FX_STATUSES)[number];

export const SHIPPING_AVAILABILITY = ["AVAILABLE", "UNAVAILABLE", "UNKNOWN"] as const;
export type ShippingAvailability = (typeof SHIPPING_AVAILABILITY)[number];

export const PROVIDER_STATUS = [
  "READY",
  "NOT_CONFIGURED",
  "AUTH_FAILED",
  "RATE_LIMITED",
  "DEGRADED",
  "UNAVAILABLE",
] as const;
export type ProviderStatus = (typeof PROVIDER_STATUS)[number];

export const PRODUCT_STATUS = [
  "DISCOVERED",
  "ANALYZING",
  "REJECTED",
  "REVIEW_REQUIRED",
  "TEST_SELL",
  "APPROVED",
  "LISTING_READY",
  "LIVE",
  "PAUSED",
  "SOLD_OUT",
  "BLOCKED",
  "KOREA_SHIPPING_UNAVAILABLE",
] as const;
export type ProductStatus = (typeof PRODUCT_STATUS)[number];

export const RISK_DECISION = ["PASS", "REVIEW_REQUIRED", "BLOCK"] as const;
export type RiskDecision = (typeof RISK_DECISION)[number];

export const JOB_TYPES = [
  "SCOUT_PRODUCTS",
  "ANALYZE_MARKET",
  "CHECK_PROFIT",
  "CHECK_RISK",
  "GENERATE_CONTENT",
  "SYNC_LISTING",
  "SYNC_ORDER",
  "FULFILL_ORDER",
  "SYNC_TRACKING",
  "PROCESS_RETURN",
  "RECALCULATE_PROFIT",
  "PLAN_MISSION",
  "RUN_DEPARTMENT",
  "CROSS_REVIEW",
  "SYNTHESIZE_STRATEGY",
  "AUDIT_MISSION",
  "FINALIZE_MISSION",
  "WATCH_HEALTH",
  "WATCH_API",
  "WATCH_JOBS",
  "WATCH_DATA",
  "WATCH_COST",
  "HANDLE_INCIDENT",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUS = [
  "QUEUED",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "RETRYING",
  "BLOCKED",
] as const;
export type JobStatus = (typeof JOB_STATUS)[number];

export const SAFETY_ACTIONS = [
  "SUPPLIER_ORDER",
  "MARKETPLACE_LISTING",
  "PRICE_UPDATE",
  "STOCK_UPDATE",
  "CANCEL_ORDER",
  "CUSTOMER_REFUND",
  "SUPPLIER_PAYMENT",
  "PAUSE_PRODUCT",
  "RESUME_PRODUCT",
] as const;
export type SafetyAction = (typeof SAFETY_ACTIONS)[number];

export interface SourcedNumber {
  value: number | null;
  currency: "KRW" | "USD";
  freshness: DataFreshness;
  source: string;
  capturedAt: string | null;
  note?: string;
}

export interface DemandSignal {
  kind: string;
  value: string;
  freshness: DataFreshness;
  source: string;
}

export interface MarketSnapshot {
  productId: string;
  channel: string;
  observedPrices: number[];
  medianPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  competitorCount: number | null;
  demandSignals: DemandSignal[];
  confidence: number;
  capturedAt: string;
  source: string;
  freshness: DataFreshness;
}

export interface ProfitAnalysis {
  sellingPrice: number;
  productCost: number;
  internationalShipping: number;
  domesticShipping: number;
  customsDuty: number;
  vat: number;
  marketplaceFee: number;
  paymentFee: number;
  expectedAdCost: number;
  promotionCost: number;
  expectedReturnLoss: number;
  fxBuffer: number;
  otherCost: number;
  totalCost: number;
  expectedNetProfit: number;
  netMarginRate: number;
  roi: number;
  confidence: number;
  missingInputs: string[];
  inputFreshness: Record<string, DataFreshness>;
  currency: "KRW";
  calculatedAt: string;
  stage: ProfitStage;
  sellingPriceKind: "TARGET_MARGIN_PRICE" | "MARKET_OBSERVED_PRICE" | "NONE";
}

export interface ProfitInput {
  sellingPrice: number | null;
  productCost: number | null;
  internationalShipping: number | null;
  domesticShipping: number | null;
  customsDuty: number | null;
  vat: number | null;
  marketplaceFee: number | null;
  paymentFee: number | null;
  expectedAdCost: number | null;
  promotionCost: number | null;
  expectedReturnLoss: number | null;
  fxBuffer: number | null;
  otherCost: number | null;
  inputFreshness?: Partial<Record<string, DataFreshness>>;
  now?: Date;
  sellingPriceKind?: "TARGET_MARGIN_PRICE" | "MARKET_OBSERVED_PRICE" | "NONE";
  fxStatus?: FxStatus;
}

export interface ScoreBreakdown {
  expectedNetProfit: { score: number; reason: string };
  netMargin: { score: number; reason: string };
  competition: { score: number; reason: string };
  supplyStability: { score: number; reason: string };
  deliverySpeed: { score: number; reason: string };
  expectedReturnRate: { score: number; reason: string };
  riskScore: { score: number; reason: string };
  dataConfidence: { score: number; reason: string };
}

export interface DecisionResult {
  status: ProductStatus;
  compositeScore: number;
  scores: ScoreBreakdown;
  reasons: string[];
  warnings: string[];
  blockedByRisk: boolean;
}

export interface RiskFinding {
  code: string;
  label: string;
  severity: "info" | "warning" | "block";
  evidence: string;
}

export interface RiskAssessment {
  decision: RiskDecision;
  findings: RiskFinding[];
  score: number;
  assessedAt: string;
}

export interface ScoutFilterSettings {
  limit: number;
  keyword: string;
  maxSupplierPrice: number | null;
  maxShippingCost: number | null;
  minPreliminaryMargin: number;
  maximumDeliveryDays: number | null;
  allowedCategories: string[];
  blockedCategories: string[];
}

export interface FxSettings {
  provider: "none" | "manual" | "frankfurter";
  manualUsdKrw: number | null;
}

export interface AiBudgetSettings {
  maxPerMissionUsd: number;
  dailyUsd: number;
  monthlyUsd: number;
  emergencyReserveUsd: number;
}

export interface SafetySettings {
  maxPerOrderKRW: number;
  maxDailyKRW: number;
  maxMonthlyKRW: number;
  minMarginRate: number;
  minConfidence: number;
  maxSupplierPriceIncreaseRate: number;
  blockedCategories: string[];
  blockedSuppliers: string[];
  blockedCountries: string[];
  manualApprovalThresholdKRW: number;
  operatingMode: OperatingMode;
  targetMarginRate: number;
  fx: FxSettings;
  scout: ScoutFilterSettings;
  globalSafetyLock: boolean;
  aiBudget: AiBudgetSettings;
}

export interface SafetyContext {
  action: SafetyAction;
  amountKRW: number;
  dailySpentKRW: number;
  monthlySpentKRW: number;
  netMarginRate: number | null;
  confidence: number | null;
  supplierPriceIncreaseRate: number | null;
  category?: string | null;
  supplierId?: string | null;
  country?: string | null;
  riskDecision?: RiskDecision | null;
  humanApproved?: boolean;
}

export interface SafetyGateResult {
  allowed: boolean;
  decision: "ALLOW" | "REVIEW_REQUIRED" | "BLOCK";
  reasons: string[];
  ruleHits: string[];
  code?: string;
}

export interface AiDecisionTrace {
  decision: string;
  reasons: string[];
  warnings: string[];
  createdAt: string;
  actor: string;
}

export interface EncryptedShippingInfo {
  ciphertext: string;
  iv: string;
  tag: string;
  keyVersion: string;
}

export interface CommerceOrder {
  id: string;
  marketplace: string;
  marketplaceOrderId: string;
  productId: string;
  variantId: string;
  quantity: number;
  saleAmount: number;
  customerShippingInfo: EncryptedShippingInfo;
  orderStatus: string;
  fulfillmentStatus: string;
  supplierOrderId?: string;
  createdAt: string;
}

export interface VisionAnalysis {
  category: string | null;
  confidence: number;
  productType: string | null;
  features: string[];
  estimatedCategory: string | null;
  material: string | null;
  colors: string[];
  designTraits: string[];
  brandVisible: boolean;
  possibleBrand: string | null;
  modelNameCandidates: string[];
  supplierSearchKeywords: string[];
  domesticMarketKeywords: string[];
  similarProductQuery: string | null;
  source: "AI" | "UNAVAILABLE";
  provider: string | null;
}

export const DEFAULT_SCOUT_FILTERS: ScoutFilterSettings = {
  limit: 30,
  keyword: "storage organizer",
  maxSupplierPrice: null,
  maxShippingCost: null,
  minPreliminaryMargin: 0.15,
  maximumDeliveryDays: 21,
  allowedCategories: [],
  blockedCategories: [],
};

export const DEFAULT_SAFETY_SETTINGS: SafetySettings = {
  maxPerOrderKRW: 100_000,
  maxDailyKRW: 500_000,
  maxMonthlyKRW: 5_000_000,
  minMarginRate: 0.2,
  minConfidence: 0.6,
  maxSupplierPriceIncreaseRate: 0.05,
  blockedCategories: [],
  blockedSuppliers: [],
  blockedCountries: [],
  manualApprovalThresholdKRW: 50_000,
  operatingMode: "LIVE_OBSERVE",
  targetMarginRate: 0.35,
  fx: { provider: "none", manualUsdKrw: null },
  scout: DEFAULT_SCOUT_FILTERS,
  globalSafetyLock: false,
  aiBudget: { maxPerMissionUsd: 1, dailyUsd: 10, monthlyUsd: 80, emergencyReserveUsd: 20 },
};
