import { z } from 'zod';

export const AITradeDecisionSchema = z.object({
  symbol: z.string().min(1),
  action: z.enum(['BUY', 'WATCH', 'REJECT']),
  confidence: z.number().min(0).max(1),
  bullScore: z.number().min(0).max(100),
  bearScore: z.number().min(0).max(100),
  dataQuality: z.number().min(0).max(100),
  reasons: z.array(z.string()).min(1),
  risks: z.array(z.string()),
  generatedAt: z.string(),
});

export type ValidatedAITradeDecision = z.infer<typeof AITradeDecisionSchema>;
