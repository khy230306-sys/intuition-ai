import type {
  BetRequest,
  BetResult,
  RouletteResult,
  RouletteSiteAdapter,
  TableInfo,
} from '../../core/types.js';
import { numberToColor } from '../../core/roulette/colors.js';
import { createRoundId } from '../../core/roulette/result.js';

/**
 * Evolution Gaming site adapter (Playwright).
 *
 * Uses the user's already-authenticated browser session via CDP/persistent context.
 * Does NOT bypass CAPTCHA, 2FA, or detection systems.
 *
 * Selectors are isolated here so DOM changes never touch the core engine.
 */
export class EvolutionPlaywrightAdapter implements RouletteSiteAdapter {
  private browser: import('playwright').Browser | null = null;
  private page: import('playwright').Page | null = null;
  private connected = false;

  constructor(
    private options: {
      /** CDP endpoint from an already-logged-in Chrome, e.g. http://127.0.0.1:9222 */
      cdpUrl?: string;
      /** Optional direct URL after manual login */
      tableUrl?: string;
      headless?: boolean;
    } = {},
  ) {}

  async connect(): Promise<void> {
    const pw = await import('playwright');
    if (this.options.cdpUrl) {
      this.browser = await pw.chromium.connectOverCDP(this.options.cdpUrl);
      const contexts = this.browser.contexts();
      const ctx = contexts[0] ?? (await this.browser.newContext());
      this.page = ctx.pages()[0] ?? (await ctx.newPage());
    } else {
      this.browser = await pw.chromium.launch({
        headless: this.options.headless ?? false,
      });
      const ctx = await this.browser.newContext();
      this.page = await ctx.newPage();
      if (this.options.tableUrl) {
        await this.page.goto(this.options.tableUrl, { waitUntil: 'domcontentloaded' });
      }
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    // Do not close user's CDP browser; only close if we launched it.
    if (!this.options.cdpUrl && this.browser) {
      await this.browser.close();
    }
    this.browser = null;
    this.page = null;
    this.connected = false;
  }

  async detectTable(): Promise<TableInfo> {
    this.ensurePage();
    const title = await this.page!.title().catch(() => 'Evolution Roulette');
    const url = this.page!.url();
    return {
      tableId: url || 'evolution-unknown',
      tableName: title || 'Evolution Roulette',
      gameType: 'european-roulette',
      confirmed: Boolean(url && /evolution|roulette/i.test(url + title)),
    };
  }

  /**
   * Attempts to read the latest result from known Evolution DOM patterns.
   * Returns null if selectors fail — core engine stays unaffected.
   */
  async readLatestResult(): Promise<RouletteResult | null> {
    this.ensurePage();
    const page = this.page!;

    const raw = await page
      .evaluate(() => {
        // Adapter-local selectors — adjust when Evolution DOM changes.
        const candidates = [
          '[data-role="recent-results"] [data-role="result"]',
          '.recent-results .result-number',
          '[class*="RouletteRecentResults"] [class*="number"]',
          '[class*="footer"] [class*="result"]',
        ];
        for (const sel of candidates) {
          const el = document.querySelector(sel);
          if (el?.textContent) {
            const m = el.textContent.trim().match(/\d{1,2}/);
            if (m) return { number: Number(m[0]), raw: el.textContent.trim() };
          }
        }
        return null;
      })
      .catch(() => null);

    if (!raw || !Number.isInteger(raw.number) || raw.number < 0 || raw.number > 36) {
      return null;
    }

    return {
      roundId: createRoundId('evo'),
      number: raw.number,
      color: numberToColor(raw.number),
      timestamp: Date.now(),
      source: 'live',
    };
  }

  async isBettingOpen(): Promise<boolean> {
    this.ensurePage();
    return this.page!
      .evaluate(() => {
        const text = document.body?.innerText ?? '';
        if (/place your bets|bets open|betting open/i.test(text)) return true;
        if (/bets closed|wait for next|no more bets/i.test(text)) return false;
        return false;
      })
      .catch(() => false);
  }

  async getBalance(): Promise<number | null> {
    this.ensurePage();
    const bal = await this.page!
      .evaluate(() => {
        const el =
          document.querySelector('[data-role="balance"]') ||
          document.querySelector('[class*="balance"]');
        if (!el?.textContent) return null;
        const m = el.textContent.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
        return m ? Number(m[1]) : null;
      })
      .catch(() => null);
    return bal;
  }

  async placeBet(request: BetRequest): Promise<BetResult> {
    // REAL chip clicking must be implemented against a logged-in session and verified selectors.
    // We intentionally refuse silent/guesswork clicks.
    return {
      ok: false,
      dryRun: request.dryRun,
      placed: false,
      message:
        'Evolution placeBet requires verified table selectors and an authenticated session. Use DRY_RUN until selectors are confirmed on your table.',
      request,
    };
  }

  private ensurePage(): void {
    if (!this.connected || !this.page) {
      throw new Error('Evolution adapter not connected — login to Evolution in Chrome with CDP, then connect');
    }
  }
}

/** Simulation adapter for local testing without a live site. */
export class SimulationAdapter implements RouletteSiteAdapter {
  private queue: RouletteResult[] = [];
  private idx = 0;

  constructor(results: RouletteResult[] = []) {
    this.queue = results;
  }

  enqueue(results: RouletteResult[]): void {
    this.queue.push(...results);
  }

  async connect(): Promise<void> {
    /* no-op */
  }

  async detectTable(): Promise<TableInfo> {
    return {
      tableId: 'sim-table',
      tableName: 'Simulation Roulette',
      gameType: 'european-roulette',
      confirmed: true,
    };
  }

  async readLatestResult(): Promise<RouletteResult | null> {
    if (this.idx >= this.queue.length) return null;
    const r = this.queue[this.idx]!;
    this.idx += 1;
    return r;
  }

  async placeBet(request: BetRequest): Promise<BetResult> {
    return {
      ok: true,
      dryRun: request.dryRun,
      placed: !request.dryRun,
      message: request.dryRun ? 'Sim dry run' : 'Sim placed',
      request,
    };
  }

  async getBalance(): Promise<number | null> {
    return 10000;
  }

  async isBettingOpen(): Promise<boolean> {
    return true;
  }
}
