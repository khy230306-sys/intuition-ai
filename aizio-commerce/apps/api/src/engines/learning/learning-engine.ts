export interface LearningRecord {
  productId: string;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  conversion: number | null;
  orders: number | null;
  cancellations: number | null;
  returns: number | null;
  complaints: number | null;
  adSpend: number | null;
  revenue: number | null;
  actualNetProfit: number | null;
  stockouts: number | null;
  deliveryDays: number | null;
  rating: number | null;
  reviewSentiment: string | null;
  aiRecommendation: string | null;
  actualOutcome: string | null;
}

export function computeCtr(impressions: number | null, clicks: number | null): number | null {
  if (impressions === null || clicks === null || impressions <= 0) return null;
  return clicks / impressions;
}

export function outcomeGap(aiRecommendation: string | null, actualOutcome: string | null): string {
  if (!aiRecommendation || !actualOutcome) return "INSUFFICIENT_DATA";
  return aiRecommendation === actualOutcome ? "MATCH" : "MISMATCH";
}
