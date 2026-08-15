export interface RoutedCommand {
  intent:
    | "scout"
    | "recommendations"
    | "filter_margin"
    | "high_return"
    | "pause_loss"
    | "orders_today"
    | "cost_up"
    | "profit_month"
    | "unknown";
  slots: Record<string, string>;
  mutating: boolean;
  source: "CODE";
}

const MUTATING = new Set(["scout", "pause_loss"]);

export function routeCommand(text: string): RoutedCommand {
  const t = text.trim();
  let intent: RoutedCommand["intent"] = "unknown";
  const slots: Record<string, string> = {};

  if (/찾아|스카우트|상품 찾/.test(t) && /오늘|팔만|추천|상품/.test(t)) intent = "scout";
  else if (/추천/.test(t)) intent = "recommendations";
  else if (/순마진|마진/.test(t) && /\d+/.test(t)) {
    intent = "filter_margin";
    const m = t.match(/(\d+)\s*%/);
    if (m?.[1]) slots.minMargin = String(Number(m[1]) / 100);
  }   else if (/반품/.test(t) && !/왜|조사/.test(t)) intent = "high_return";
  else if ((/적자/.test(t) && /중지/.test(t)) || /일시중지/.test(t)) intent = "pause_loss";
  else if (/주문/.test(t)) intent = "orders_today";
  else if (/원가/.test(t) && /오른|상승/.test(t)) intent = "cost_up";
  else if (/순이익|수익/.test(t)) intent = "profit_month";
  else if (/찾아/.test(t)) intent = "scout";

  return { intent, slots, mutating: MUTATING.has(intent), source: "CODE" };
}
