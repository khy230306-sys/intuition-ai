export interface SettlementInput {
  expectedNetProfit: number | null;
  actualProductCost: number | null;
  actualShipping: number | null;
  actualFee: number | null;
  actualAds: number | null;
  actualRefund: number | null;
  actualReturnLoss: number | null;
  actualSettlement: number | null;
}

export interface SettlementResult extends SettlementInput {
  actualNetProfit: number | null;
  profitPredictionError: number | null;
}

export function settle(input: SettlementInput): SettlementResult {
  const parts = [
    input.actualProductCost,
    input.actualShipping,
    input.actualFee,
    input.actualAds,
    input.actualRefund,
    input.actualReturnLoss,
  ];
  if (input.actualSettlement === null || parts.some((p) => p === null)) {
    return {
      ...input,
      actualNetProfit: null,
      profitPredictionError: null,
    };
  }
  const costs = parts.reduce<number>((s, n) => s + (n ?? 0), 0);
  const actualNetProfit = input.actualSettlement - costs;
  const profitPredictionError =
    input.expectedNetProfit === null ? null : actualNetProfit - input.expectedNetProfit;
  return { ...input, actualNetProfit, profitPredictionError };
}
