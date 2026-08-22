import type { MarketEvent } from '@aizio/trade-shared';
import { prisma } from '../db/client.js';

/**
 * EventIntelligenceEngine — structure for filings/news.
 * V1.1: Tier-1 placeholder + optional DART/filing hook (TODO_PROVIDER_IMPLEMENTATION for live feeds).
 * News NEVER directly creates BUY — only evidence.
 */
export class EventIntelligenceEngine {
  async collectOfficial(symbol?: string): Promise<MarketEvent[]> {
    // Official filings feed not configured → empty verified list (not mock buys)
    const events: MarketEvent[] = [];
    const now = new Date().toISOString();
    // Structure-only heartbeat event (not used for orders)
    if (process.env.EVENT_ENGINE_HEARTBEAT === 'true') {
      events.push({
        symbol,
        title: 'EventIntelligenceEngine ready',
        summary: 'Awaiting Tier-1 filing/news provider credentials',
        source: 'AIZIO_INTERNAL',
        sourceTier: 1,
        publishedAt: now,
        receivedAt: now,
        verified: false,
        relevance: 0,
      });
    }
    return events;
  }

  toEvidence(events: MarketEvent[]) {
    return events
      .filter((e) => e.sourceTier <= 3 && e.verified)
      .map((e) => ({
        metric: 'event',
        value: e.title,
        reason: `Tier${e.sourceTier}:${e.source}`,
      }));
  }

  async persist(events: MarketEvent[]) {
    for (const e of events) {
      await prisma.systemEvent.create({
        data: {
          kind: 'MARKET_EVENT',
          level: 'info',
          message: e.title,
          detailJson: JSON.stringify(e),
        },
      });
    }
  }
}

export const eventIntelligence = new EventIntelligenceEngine();
